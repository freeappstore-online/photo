import type {
  Adjustments,
  CropRect,
  ImageState,
  Layer,
} from "./types";

/* ------------------------------ utils ------------------------------ */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function get2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get 2d context");
  return ctx;
}

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function createInitialImageState(
  dataUrl: string,
  maxDim = 4096,
): Promise<ImageState> {
  const img = await loadImage(dataUrl);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxDim || h > maxDim) {
    const s = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const c = makeCanvas(w, h);
  const ctx = get2d(c);
  ctx.drawImage(img, 0, 0, w, h);
  return {
    width: w,
    height: h,
    baseDataUrl: c.toDataURL("image/png"),
  };
}

/* ------------------------------ filters ------------------------------ */

// Build the Canvas2D "filter" string from adjustments
// Brightness/contrast/saturation/hue/blur/sepia/grayscale/invert are CSS-filter native.
export function filterString(a: Adjustments): string {
  const parts: string[] = [];
  // brightness: 100 -> 200%, -100 -> 0%
  parts.push(`brightness(${(100 + a.brightness) / 100})`);
  // contrast: 100 -> 200%, -100 -> 0%
  parts.push(`contrast(${(100 + a.contrast) / 100})`);
  // saturation: 100 -> 200%
  parts.push(`saturate(${(100 + a.saturation) / 100})`);
  if (a.hue !== 0) parts.push(`hue-rotate(${a.hue}deg)`);
  if (a.blur > 0) parts.push(`blur(${a.blur}px)`);
  if (a.sepia > 0) parts.push(`sepia(${a.sepia / 100})`);
  if (a.grayscale > 0) parts.push(`grayscale(${a.grayscale / 100})`);
  if (a.invert > 0) parts.push(`invert(${a.invert / 100})`);
  return parts.join(" ");
}

// 3x3 sharpen convolution applied via ImageData on a canvas
export function applySharpen(c: HTMLCanvasElement, amount: number) {
  if (amount <= 0) return;
  const ctx = get2d(c);
  const { width, height } = c;
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const s = src.data;
  const d = dst.data;

  // mix between identity kernel and a sharpening kernel
  const mix = Math.min(1, amount / 100);
  // sharpening kernel
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let r = 0,
        g = 0,
        b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const xx = Math.min(width - 1, Math.max(0, x + kx));
          const yy = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (yy * width + xx) * 4;
          const kk = k[(ky + 1) * 3 + (kx + 1)]!;
          r += s[idx]! * kk;
          g += s[idx + 1]! * kk;
          b += s[idx + 2]! * kk;
        }
      }
      const oi = (y * width + x) * 4;
      const sr = s[i]!;
      const sg = s[i + 1]!;
      const sb = s[i + 2]!;
      const sa = s[i + 3]!;
      d[oi] = Math.max(0, Math.min(255, sr * (1 - mix) + r * mix));
      d[oi + 1] = Math.max(0, Math.min(255, sg * (1 - mix) + g * mix));
      d[oi + 2] = Math.max(0, Math.min(255, sb * (1 - mix) + b * mix));
      d[oi + 3] = sa;
    }
  }
  ctx.putImageData(dst, 0, 0);
}

// Exposure: gamma adjustment via lookup table
export function applyExposure(c: HTMLCanvasElement, exposure: number) {
  if (exposure === 0) return;
  const ctx = get2d(c);
  const { width, height } = c;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  // exposure -100..100 -> gamma 2.0..0.5
  const gamma = Math.pow(2, -exposure / 100);
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * Math.pow(i / 255, gamma));
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]!]!;
    d[i + 1] = lut[d[i + 1]!]!;
    d[i + 2] = lut[d[i + 2]!]!;
  }
  ctx.putImageData(img, 0, 0);
}

// Vignette: darken radially toward edges
export function applyVignette(c: HTMLCanvasElement, amount: number) {
  if (amount <= 0) return;
  const ctx = get2d(c);
  const { width, height } = c;
  const cx = width / 2;
  const cy = height / 2;
  const max = Math.sqrt(cx * cx + cy * cy);
  const grd = ctx.createRadialGradient(cx, cy, max * 0.5, cx, cy, max);
  const a = (amount / 100) * 0.85;
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
}

/* ------------------------------ render pipeline ------------------------------ */

// Renders the editor state at the image's native resolution into the provided canvas.
// Steps: draw base (with CSS filter), apply convolution sharpen, exposure, vignette,
// then render layers (draw strokes, text, stickers) on top.
export async function renderToCanvas(
  state: {
    image: ImageState;
    adjustments: Adjustments;
    layers: Layer[];
  },
  target: HTMLCanvasElement,
  baseImage?: HTMLImageElement,
): Promise<void> {
  const { image, adjustments, layers } = state;
  target.width = image.width;
  target.height = image.height;
  const ctx = get2d(target);

  const img = baseImage ?? (await loadImage(image.baseDataUrl));

  // Step 1: draw base with CSS filter
  ctx.save();
  ctx.filter = filterString(adjustments);
  ctx.drawImage(img, 0, 0, image.width, image.height);
  ctx.restore();

  // Step 2: sharpen via convolution
  if (adjustments.sharpen > 0) {
    applySharpen(target, adjustments.sharpen);
  }

  // Step 3: exposure (gamma)
  if (adjustments.exposure !== 0) {
    applyExposure(target, adjustments.exposure);
  }

  // Step 4: vignette
  if (adjustments.vignette > 0) {
    applyVignette(target, adjustments.vignette);
  }

  // Step 5: draw layers
  // imageWidth equals canvas.width here, so layer sizes (in image px) map 1:1.
  drawLayers(ctx, layers, image.width, image.height, image.width);
}

// Render all overlay layers onto ctx.
// canvasW/canvasH are the destination canvas dimensions.
// imageWidth is the image's true width in pixels — layer sizes (fontSize,
// stroke.size, sticker.size) are expressed in image-pixel space, so we scale
// them by (canvasW / imageWidth) to render at the right visual size on any
// canvas size (e.g. a shrunk preview).
export function drawLayers(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  canvasW: number,
  canvasH: number,
  imageWidth: number,
) {
  const scale = canvasW / imageWidth;
  for (const layer of layers) {
    if (layer.kind === "draw") {
      for (const stroke of layer.strokes) {
        if (stroke.points.length === 0) continue;
        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size * scale;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const p0 = stroke.points[0]!;
        ctx.moveTo(p0.x * canvasW, p0.y * canvasH);
        for (let i = 1; i < stroke.points.length; i++) {
          const p = stroke.points[i]!;
          ctx.lineTo(p.x * canvasW, p.y * canvasH);
        }
        ctx.stroke();
        ctx.restore();
      }
    } else if (layer.kind === "text") {
      ctx.save();
      const style: string[] = [];
      if (layer.italic) style.push("italic");
      if (layer.bold) style.push("700");
      else style.push("400");
      const px = layer.fontSize * scale;
      ctx.font = `${style.join(" ")} ${px}px ${layer.fontFamily}`;
      ctx.fillStyle = layer.color;
      ctx.textBaseline = "top";
      ctx.fillText(layer.text, layer.x * canvasW, layer.y * canvasH);
      ctx.restore();
    } else if (layer.kind === "sticker") {
      ctx.save();
      ctx.translate(layer.x * canvasW, layer.y * canvasH);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      const px = layer.size * scale;
      ctx.font = `${px}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(layer.emoji, 0, 0);
      ctx.restore();
    }
  }
}

/* ------------------------------ transforms ------------------------------ */

// Apply a crop to the current image, baking layers in (so layer coords stay valid).
export async function applyCrop(
  state: {
    image: ImageState;
    adjustments: Adjustments;
    layers: Layer[];
  },
  crop: CropRect,
): Promise<ImageState> {
  const baseW = state.image.width;
  const baseH = state.image.height;
  const cx = Math.max(0, Math.round(crop.x * baseW));
  const cy = Math.max(0, Math.round(crop.y * baseH));
  const cw = Math.max(1, Math.round(crop.w * baseW));
  const ch = Math.max(1, Math.round(crop.h * baseH));

  const full = makeCanvas(baseW, baseH);
  await renderToCanvas(state, full);
  const out = makeCanvas(cw, ch);
  const octx = get2d(out);
  octx.drawImage(full, cx, cy, cw, ch, 0, 0, cw, ch);
  return {
    width: cw,
    height: ch,
    baseDataUrl: out.toDataURL("image/png"),
  };
}

export async function applyRotate(
  state: {
    image: ImageState;
    adjustments: Adjustments;
    layers: Layer[];
  },
  degrees: number,
): Promise<ImageState> {
  const baseW = state.image.width;
  const baseH = state.image.height;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const newW = Math.round(baseW * cos + baseH * sin);
  const newH = Math.round(baseW * sin + baseH * cos);

  const full = makeCanvas(baseW, baseH);
  await renderToCanvas(state, full);
  const out = makeCanvas(newW, newH);
  const octx = get2d(out);
  octx.translate(newW / 2, newH / 2);
  octx.rotate(rad);
  octx.drawImage(full, -baseW / 2, -baseH / 2);
  return {
    width: newW,
    height: newH,
    baseDataUrl: out.toDataURL("image/png"),
  };
}

export async function applyFlip(
  state: {
    image: ImageState;
    adjustments: Adjustments;
    layers: Layer[];
  },
  axis: "h" | "v",
): Promise<ImageState> {
  const baseW = state.image.width;
  const baseH = state.image.height;
  const full = makeCanvas(baseW, baseH);
  await renderToCanvas(state, full);
  const out = makeCanvas(baseW, baseH);
  const octx = get2d(out);
  if (axis === "h") {
    octx.translate(baseW, 0);
    octx.scale(-1, 1);
  } else {
    octx.translate(0, baseH);
    octx.scale(1, -1);
  }
  octx.drawImage(full, 0, 0);
  return {
    width: baseW,
    height: baseH,
    baseDataUrl: out.toDataURL("image/png"),
  };
}

export async function applyResize(
  state: {
    image: ImageState;
    adjustments: Adjustments;
    layers: Layer[];
  },
  newW: number,
  newH: number,
): Promise<ImageState> {
  const full = makeCanvas(state.image.width, state.image.height);
  await renderToCanvas(state, full);
  const w = Math.max(1, Math.round(newW));
  const h = Math.max(1, Math.round(newH));
  const out = makeCanvas(w, h);
  const octx = get2d(out);
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(full, 0, 0, w, h);
  return {
    width: w,
    height: h,
    baseDataUrl: out.toDataURL("image/png"),
  };
}

/* ------------------------------ export ------------------------------ */

export async function exportImage(
  state: {
    image: ImageState;
    adjustments: Adjustments;
    layers: Layer[];
  },
  format: "image/jpeg" | "image/png",
  quality = 0.92,
): Promise<Blob> {
  const c = makeCanvas(state.image.width, state.image.height);
  await renderToCanvas(state, c);
  return await new Promise<Blob>((resolve, reject) => {
    c.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Failed to encode image"));
        else resolve(blob);
      },
      format,
      quality,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    const ClipboardItemCtor: typeof ClipboardItem | undefined = (
      window as unknown as { ClipboardItem?: typeof ClipboardItem }
    ).ClipboardItem;
    if (!ClipboardItemCtor || !navigator.clipboard?.write) return false;
    const item = new ClipboardItemCtor({ [blob.type]: blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}
