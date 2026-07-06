import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from "react";
import type {
  Adjustments,
  CropRect,
  DrawLayer,
  ImageState,
  Layer,
  StickerLayer,
  TextLayer,
  Tool,
} from "../types";
import {
  drawLayers,
  filterString,
  applySharpen,
  applyExposure,
  applyVignette,
  loadImage,
} from "../image";

interface Props {
  image: ImageState;
  adjustments: Adjustments;
  layers: Layer[];
  setLayers: (l: Layer[]) => void;
  tool: Tool;

  // crop
  crop: CropRect | null;
  setCrop: (c: CropRect | null) => void;
  cropAspect: number | null;

  // draw
  brushColor: string;
  brushSize: number;

  // selection (text / sticker)
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;

  // compare
  comparing: boolean;
}

// Computes the on-screen rectangle of the image inside the editor area,
// fitting "contain" with margin.
function fitContain(
  containerW: number,
  containerH: number,
  imgW: number,
  imgH: number,
): { x: number; y: number; w: number; h: number; scale: number } {
  const pad = 16;
  const aw = Math.max(1, containerW - pad * 2);
  const ah = Math.max(1, containerH - pad * 2);
  const scale = Math.min(aw / imgW, ah / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  const x = (containerW - w) / 2;
  const y = (containerH - h) / 2;
  return { x, y, w, h, scale };
}

interface ImgRect {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}

export function Editor(props: Props) {
  const {
    image,
    adjustments,
    layers,
    setLayers,
    tool,
    crop,
    setCrop,
    cropAspect,
    brushColor,
    brushSize,
    selectedLayerId,
    setSelectedLayerId,
    comparing,
  } = props;

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Resize observer for the canvas wrapper
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerSize({
        w: el.clientWidth,
        h: el.clientHeight,
      });
    });
    ro.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Load base image
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const img = await loadImage(image.baseDataUrl);
      if (!cancelled) {
        baseImgRef.current = img;
        // trigger redraw
        setRedraw((n) => n + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [image.baseDataUrl]);

  const [redrawTick, setRedraw] = useState(0);

  // The on-screen fitted rectangle
  const fit: ImgRect | null = useMemo(() => {
    if (!containerSize.w || !containerSize.h) return null;
    return fitContain(containerSize.w, containerSize.h, image.width, image.height);
  }, [containerSize, image.width, image.height]);

  // Render the canvas at fit resolution every time anything changes.
  useEffect(() => {
    if (!fit) return;
    const c = canvasRef.current;
    const img = baseImgRef.current;
    if (!c || !img) return;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.max(1, Math.round(fit.w * dpr));
    const targetH = Math.max(1, Math.round(fit.h * dpr));
    if (c.width !== targetW) c.width = targetW;
    if (c.height !== targetH) c.height = targetH;
    c.style.width = `${fit.w}px`;
    c.style.height = `${fit.h}px`;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);

    if (comparing) {
      // Just draw the base, no filters/layers
      ctx.drawImage(img, 0, 0, c.width, c.height);
      ctx.restore();
      return;
    }

    // Draw with filter applied. We render at the display size (smaller),
    // then apply convolution/vignette at display res for speed.
    ctx.filter = filterString(adjustments);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.filter = "none";
    ctx.restore();

    if (adjustments.sharpen > 0) applySharpen(c, adjustments.sharpen);
    if (adjustments.exposure !== 0) applyExposure(c, adjustments.exposure);
    if (adjustments.vignette > 0) applyVignette(c, adjustments.vignette);

    // Draw layers — coords are normalized 0..1, so multiply by current canvas;
    // sizes are in image-pixel space and get scaled inside drawLayers.
    const ctx2 = c.getContext("2d", { willReadFrequently: true });
    if (ctx2) drawLayers(ctx2, layers, c.width, c.height, image.width);
  }, [adjustments, layers, fit, redrawTick, comparing, image.width]);

  /* ---------------- pointer-based interaction ---------------- */

  // shared utility — convert window coords to normalized image coords (0..1)
  const toImageCoord = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = wrapRef.current;
      if (!el || !fit) return null;
      const r = el.getBoundingClientRect();
      const px = clientX - r.left - fit.x;
      const py = clientY - r.top - fit.y;
      const x = Math.max(0, Math.min(1, px / fit.w));
      const y = Math.max(0, Math.min(1, py / fit.h));
      return { x, y };
    },
    [fit],
  );

  /* ---- Crop tool ---- */

  const cropDrag = useRef<
    | null
    | {
        mode:
          | "new"
          | "move"
          | "n"
          | "s"
          | "e"
          | "w"
          | "ne"
          | "nw"
          | "se"
          | "sw";
        startX: number;
        startY: number;
        startRect: CropRect;
      }
  >(null);

  // cropAspect is W/H in pixel space. Keep rect.w (normalized), compute the
  // matching normalized height, clamp to image bounds.
  const applyAspectToCrop = useCallback(
    (rect: CropRect): CropRect => {
      if (!cropAspect) return rect;
      const imgW = image.width;
      const imgH = image.height;
      const wPx = rect.w * imgW;
      let hPx = wPx / cropAspect;
      const maxHpx = (1 - rect.y) * imgH;
      if (hPx > maxHpx) hPx = maxHpx;
      return { ...rect, h: hPx / imgH };
    },
    [cropAspect, image.width, image.height],
  );

  const onCropPointerDown = (e: ReactPointerEvent) => {
    if (tool !== "crop") return;
    const pt = toImageCoord(e.clientX, e.clientY);
    if (!pt) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (crop) {
      // Check if inside crop -> move; near edges -> resize
      const left = crop.x;
      const right = crop.x + crop.w;
      const top = crop.y;
      const bottom = crop.y + crop.h;
      // tolerance: ~10px in image-normalized space
      const tx = 10 / (fit?.w ?? 100);
      const ty = 10 / (fit?.h ?? 100);
      const inside =
        pt.x > left && pt.x < right && pt.y > top && pt.y < bottom;
      const nearL = Math.abs(pt.x - left) < tx;
      const nearR = Math.abs(pt.x - right) < tx;
      const nearT = Math.abs(pt.y - top) < ty;
      const nearB = Math.abs(pt.y - bottom) < ty;
      let mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "new" =
        "new";
      if (nearT && nearL) mode = "nw";
      else if (nearT && nearR) mode = "ne";
      else if (nearB && nearL) mode = "sw";
      else if (nearB && nearR) mode = "se";
      else if (nearT) mode = "n";
      else if (nearB) mode = "s";
      else if (nearL) mode = "w";
      else if (nearR) mode = "e";
      else if (inside) mode = "move";

      cropDrag.current = {
        mode,
        startX: pt.x,
        startY: pt.y,
        startRect: { ...crop },
      };
      if (mode === "new") {
        setCrop({ x: pt.x, y: pt.y, w: 0, h: 0 });
        cropDrag.current.startRect = { x: pt.x, y: pt.y, w: 0, h: 0 };
      }
    } else {
      cropDrag.current = {
        mode: "new",
        startX: pt.x,
        startY: pt.y,
        startRect: { x: pt.x, y: pt.y, w: 0, h: 0 },
      };
      setCrop({ x: pt.x, y: pt.y, w: 0, h: 0 });
    }
  };

  const onCropPointerMove = (e: ReactPointerEvent) => {
    if (tool !== "crop") return;
    const drag = cropDrag.current;
    if (!drag) return;
    const pt = toImageCoord(e.clientX, e.clientY);
    if (!pt) return;
    const dx = pt.x - drag.startX;
    const dy = pt.y - drag.startY;
    let r: CropRect = { ...drag.startRect };
    const mode = drag.mode;

    if (mode === "new") {
      const x = Math.min(drag.startX, pt.x);
      const y = Math.min(drag.startY, pt.y);
      let w = Math.abs(pt.x - drag.startX);
      let h = Math.abs(pt.y - drag.startY);
      if (cropAspect) {
        // cropAspect is W/H in pixel space; convert to normalized aspect.
        const aN = cropAspect * (image.height / image.width);
        const fromW = w / aN;
        const fromH = h * aN;
        if (fromW < h) h = fromW;
        else w = fromH;
      }
      r = {
        x,
        y,
        w: Math.min(w, 1 - x),
        h: Math.min(h, 1 - y),
      };
    } else if (mode === "move") {
      r = {
        ...drag.startRect,
        x: Math.max(0, Math.min(1 - drag.startRect.w, drag.startRect.x + dx)),
        y: Math.max(0, Math.min(1 - drag.startRect.h, drag.startRect.y + dy)),
      };
    } else {
      let { x, y, w, h } = drag.startRect;
      if (mode === "e" || mode === "ne" || mode === "se") w = Math.max(0.01, drag.startRect.w + dx);
      if (mode === "w" || mode === "nw" || mode === "sw") {
        const nx = drag.startRect.x + dx;
        w = Math.max(0.01, drag.startRect.w - dx);
        x = Math.min(drag.startRect.x + drag.startRect.w - 0.01, Math.max(0, nx));
      }
      if (mode === "s" || mode === "sw" || mode === "se") h = Math.max(0.01, drag.startRect.h + dy);
      if (mode === "n" || mode === "ne" || mode === "nw") {
        const ny = drag.startRect.y + dy;
        h = Math.max(0.01, drag.startRect.h - dy);
        y = Math.min(drag.startRect.y + drag.startRect.h - 0.01, Math.max(0, ny));
      }
      // clamp
      w = Math.min(w, 1 - x);
      h = Math.min(h, 1 - y);
      r = { x, y, w, h };
      if (cropAspect) r = applyAspectToCrop(r);
    }
    setCrop(r);
  };

  const onCropPointerUp = () => {
    cropDrag.current = null;
  };

  /* ---- Draw tool ---- */

  const drawingRef = useRef<{
    layerId: string;
    strokeIndex: number;
  } | null>(null);

  const onDrawPointerDown = (e: ReactPointerEvent) => {
    if (tool !== "draw") return;
    const pt = toImageCoord(e.clientX, e.clientY);
    if (!pt) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const last = layers[layers.length - 1];
    if (last && last.kind === "draw") {
      // append a new stroke to existing draw layer
      const newStroke = {
        color: brushColor,
        size: brushSize,
        points: [pt],
      };
      const nextLayer: DrawLayer = {
        ...last,
        strokes: [...last.strokes, newStroke],
      };
      const next = [...layers.slice(0, -1), nextLayer];
      setLayers(next);
      drawingRef.current = {
        layerId: last.id,
        strokeIndex: nextLayer.strokes.length - 1,
      };
    } else {
      const id = `d_${Date.now()}`;
      const layer: DrawLayer = {
        id,
        kind: "draw",
        strokes: [{ color: brushColor, size: brushSize, points: [pt] }],
      };
      setLayers([...layers, layer]);
      drawingRef.current = { layerId: id, strokeIndex: 0 };
    }
  };

  const onDrawPointerMove = (e: ReactPointerEvent) => {
    if (tool !== "draw" || !drawingRef.current) return;
    const pt = toImageCoord(e.clientX, e.clientY);
    if (!pt) return;
    const dr = drawingRef.current;
    const next = layers.map((l) => {
      if (l.id !== dr.layerId || l.kind !== "draw") return l;
      const strokes = l.strokes.map((s, i) => {
        if (i !== dr.strokeIndex) return s;
        return { ...s, points: [...s.points, pt] };
      });
      return { ...l, strokes };
    });
    setLayers(next);
  };

  const onDrawPointerUp = () => {
    drawingRef.current = null;
  };

  /* ---- Text / Sticker drag ---- */

  const layerDrag = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const onLayerPointerDown = (
    e: ReactPointerEvent,
    layer: TextLayer | StickerLayer,
  ) => {
    e.stopPropagation();
    const pt = toImageCoord(e.clientX, e.clientY);
    if (!pt) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setSelectedLayerId(layer.id);
    layerDrag.current = {
      id: layer.id,
      startX: pt.x,
      startY: pt.y,
      origX: layer.x,
      origY: layer.y,
    };
  };

  const onLayerPointerMove = (e: ReactPointerEvent) => {
    const drag = layerDrag.current;
    if (!drag) return;
    const pt = toImageCoord(e.clientX, e.clientY);
    if (!pt) return;
    const dx = pt.x - drag.startX;
    const dy = pt.y - drag.startY;
    setLayers(
      layers.map((l) => {
        if (l.id !== drag.id) return l;
        if (l.kind === "text" || l.kind === "sticker") {
          return {
            ...l,
            x: Math.max(0, Math.min(1, drag.origX + dx)),
            y: Math.max(0, Math.min(1, drag.origY + dy)),
          };
        }
        return l;
      }),
    );
  };

  const onLayerPointerUp = () => {
    layerDrag.current = null;
  };

  /* ---------------- render ---------------- */

  // Determine canvas wrapper pointer handlers based on tool
  const wrapperHandlers: Pick<
    HTMLAttributes<HTMLDivElement>,
    "onPointerDown" | "onPointerMove" | "onPointerUp"
  > = {};

  if (tool === "crop") {
    wrapperHandlers.onPointerDown = onCropPointerDown;
    wrapperHandlers.onPointerMove = onCropPointerMove;
    wrapperHandlers.onPointerUp = onCropPointerUp;
  } else if (tool === "draw") {
    wrapperHandlers.onPointerDown = onDrawPointerDown;
    wrapperHandlers.onPointerMove = onDrawPointerMove;
    wrapperHandlers.onPointerUp = onDrawPointerUp;
  }

  const cursor =
    tool === "crop"
      ? "crosshair"
      : tool === "draw"
        ? "crosshair"
        : "default";

  // Determine text/sticker overlay boxes
  const overlayLayers = layers.filter(
    (l): l is TextLayer | StickerLayer =>
      l.kind === "text" || l.kind === "sticker",
  );

  return (
    <div
      ref={wrapRef}
      className="w-full h-full relative"
      style={{
        cursor,
        userSelect: "none",
        touchAction: "none",
        background:
          "repeating-conic-gradient(var(--color-panel) 0% 25%, var(--color-paper) 0% 50%) 50% / 24px 24px",
      }}
      onPointerMove={(e) => {
        wrapperHandlers.onPointerMove?.(e);
        onLayerPointerMove(e);
      }}
      onPointerUp={(e) => {
        wrapperHandlers.onPointerUp?.(e);
        onLayerPointerUp();
      }}
      onPointerDown={(e) => {
        wrapperHandlers.onPointerDown?.(e);
        // Click outside layers clears selection (only when not crop/draw and pointing on bg)
        if (tool === "text" || tool === "stickers") {
          // Only clear if we clicked the wrapper itself, not a layer
          if (e.target === wrapRef.current) setSelectedLayerId(null);
        }
      }}
    >
      {fit && (
        <>
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              left: fit.x,
              top: fit.y,
              width: fit.w,
              height: fit.h,
              pointerEvents: "none",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              borderRadius: "0.25rem",
            }}
          />

          {tool === "crop" && crop && (
            <CropOverlay fit={fit} crop={crop} />
          )}

          {(tool === "text" || tool === "stickers") &&
            overlayLayers.map((l) => (
              <LayerHandle
                key={l.id}
                fit={fit}
                layer={l}
                selected={l.id === selectedLayerId}
                onPointerDown={onLayerPointerDown}
              />
            ))}
        </>
      )}
    </div>
  );
}

function CropOverlay({ fit, crop }: { fit: ImgRect; crop: CropRect }) {
  const x = fit.x + crop.x * fit.w;
  const y = fit.y + crop.y * fit.h;
  const w = crop.w * fit.w;
  const h = crop.h * fit.h;
  return (
    <>
      {/* Dim the area outside the crop */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          pointerEvents: "none",
        }}
      >
        <defs>
          <mask id="cropmask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#cropmask)"
        />
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke="white"
          strokeWidth={1.5}
        />
        {/* thirds */}
        <line
          x1={x + w / 3}
          y1={y}
          x2={x + w / 3}
          y2={y + h}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1}
        />
        <line
          x1={x + (2 * w) / 3}
          y1={y}
          x2={x + (2 * w) / 3}
          y2={y + h}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1}
        />
        <line
          x1={x}
          y1={y + h / 3}
          x2={x + w}
          y2={y + h / 3}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1}
        />
        <line
          x1={x}
          y1={y + (2 * h) / 3}
          x2={x + w}
          y2={y + (2 * h) / 3}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1}
        />
        {/* handles */}
        {[
          [x, y],
          [x + w, y],
          [x, y + h],
          [x + w, y + h],
          [x + w / 2, y],
          [x + w / 2, y + h],
          [x, y + h / 2],
          [x + w, y + h / 2],
        ].map(([hx, hy], i) => (
          <rect
            key={i}
            x={(hx ?? 0) - 5}
            y={(hy ?? 0) - 5}
            width={10}
            height={10}
            fill="white"
            stroke="black"
            strokeWidth={1}
          />
        ))}
      </svg>
    </>
  );
}

function LayerHandle({
  fit,
  layer,
  selected,
  onPointerDown,
}: {
  fit: ImgRect;
  layer: TextLayer | StickerLayer;
  selected: boolean;
  onPointerDown: (
    e: ReactPointerEvent,
    layer: TextLayer | StickerLayer,
  ) => void;
}) {
  // Position the bounding box approximately.
  // For text, we have to guess width — fall back to a generous estimate.
  let boxW = 80;
  let boxH = 30;
  if (layer.kind === "text") {
    // layer.fontSize is in image-pixel space; convert to screen px via fit.scale
    const screenFontSize = layer.fontSize * fit.scale;
    boxW = Math.max(40, layer.text.length * screenFontSize * 0.55);
    boxH = screenFontSize * 1.2;
  } else {
    const screenSize = layer.size * fit.scale;
    boxW = screenSize;
    boxH = screenSize;
  }

  let left = fit.x + layer.x * fit.w;
  let top = fit.y + layer.y * fit.h;
  if (layer.kind === "sticker") {
    // sticker is drawn centered at (x,y), so the handle box should be centered
    left -= boxW / 2;
    top -= boxH / 2;
  }

  return (
    <div
      onPointerDown={(e) => onPointerDown(e, layer)}
      style={{
        position: "absolute",
        left,
        top,
        width: boxW,
        height: boxH,
        border: selected
          ? "2px dashed var(--color-accent)"
          : "1px dashed rgba(255,255,255,0.6)",
        background: "transparent",
        cursor: "move",
        boxSizing: "border-box",
        borderRadius: 2,
      }}
      title={layer.kind === "text" ? layer.text : layer.emoji}
    />
  );
}
