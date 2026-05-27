import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Adjustments,
  CropRect,
  EditorState,
  Layer,
  Tool,
} from "./types";
import { DEFAULT_ADJUSTMENTS } from "./types";
import {
  applyCrop,
  applyFlip,
  applyResize,
  applyRotate,
  copyImageToClipboard,
  createInitialImageState,
  downloadBlob,
  exportImage,
} from "./image";
import { Shell } from "./components/Shell";
import { Dropzone } from "./components/Dropzone";
import { Editor } from "./components/Editor";
import { Toolbar } from "./components/Toolbar";
import { AdjustPanel } from "./components/AdjustPanel";
import { PresetsPanel } from "./components/PresetsPanel";
import { CropPanel } from "./components/CropPanel";
import { TransformPanel } from "./components/TransformPanel";
import { TextPanel } from "./components/TextPanel";
import { DrawPanel } from "./components/DrawPanel";
import { StickerPanel } from "./components/StickerPanel";
import { ExportPanel } from "./components/ExportPanel";

const MAX_HISTORY = 30;

interface HistoryState {
  past: EditorState[];
  present: EditorState | null;
  future: EditorState[];
}

function emptyHistory(): HistoryState {
  return { past: [], present: null, future: [] };
}

export function App() {
  const [history, setHistory] = useState<HistoryState>(emptyHistory());
  const [tool, setTool] = useState<Tool>("adjust");
  const [comparing, setComparing] = useState(false);

  // Crop tool transient state
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [cropAspect, setCropAspect] = useState<number | null>(null);

  // Draw tool state
  const [brushColor, setBrushColor] = useState("#ec4899");
  const [brushSize, setBrushSize] = useState(8);

  // Active text/sticker selection
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const state = history.present;

  /* ---------------- history helpers ---------------- */

  // commit: snapshot the current state into history, replace it with `next`
  const commit = useCallback(
    (next: EditorState) => {
      setHistory((h) => {
        if (!h.present) {
          return { past: [], present: next, future: [] };
        }
        const past = [...h.past, h.present];
        if (past.length > MAX_HISTORY) past.shift();
        return { past, present: next, future: [] };
      });
    },
    [],
  );

  // update without producing a new history entry — used during continuous drags
  const replace = useCallback((next: EditorState) => {
    setHistory((h) => ({ ...h, present: next }));
  }, []);

  // commitDebounced: drops a history snapshot if the user stops interacting for a moment.
  const debounceTimer = useRef<number | null>(null);
  const preDebounceState = useRef<EditorState | null>(null);

  const beginInteraction = useCallback(() => {
    if (debounceTimer.current === null && history.present) {
      preDebounceState.current = history.present;
    }
  }, [history.present]);

  const endInteractionDebounced = useCallback(() => {
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
    }
    const before = preDebounceState.current;
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
      preDebounceState.current = null;
      setHistory((h) => {
        if (!h.present || !before) return h;
        if (before === h.present) return h;
        // push `before` into history
        const past = [...h.past, before];
        if (past.length > MAX_HISTORY) past.shift();
        return { past, present: h.present, future: [] };
      });
    }, 400);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0 || !h.present) return h;
      const prev = h.past[h.past.length - 1]!;
      return {
        past: h.past.slice(0, -1),
        present: prev,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0 || !h.present) return h;
      const next = h.future[0]!;
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
      };
    });
  }, []);

  /* ---------------- image load ---------------- */

  const loadFromDataUrl = useCallback(
    async (dataUrl: string) => {
      const image = await createInitialImageState(dataUrl);
      const fresh: EditorState = {
        image,
        adjustments: DEFAULT_ADJUSTMENTS,
        layers: [],
      };
      setHistory({ past: [], present: fresh, future: [] });
      setTool("adjust");
      setCrop(null);
      setCropAspect(null);
      setSelectedLayerId(null);
    },
    [],
  );

  /* ---------------- state mutators ---------------- */

  const setAdjustments = useCallback(
    (a: Adjustments) => {
      if (!state) return;
      beginInteraction();
      replace({ ...state, adjustments: a });
      endInteractionDebounced();
    },
    [state, beginInteraction, endInteractionDebounced, replace],
  );

  const applyPresetAdjustments = useCallback(
    (a: Adjustments) => {
      if (!state) return;
      commit({ ...state, adjustments: a });
    },
    [state, commit],
  );

  const setLayers = useCallback(
    (layers: Layer[]) => {
      if (!state) return;
      // For typing-into-a-text case, we replace without committing; the debounce
      // will catch it. Layer-add/remove are also smooth this way.
      beginInteraction();
      replace({ ...state, layers });
      endInteractionDebounced();
    },
    [state, beginInteraction, endInteractionDebounced, replace],
  );

  /* ---------------- transforms ---------------- */

  const onCropApply = useCallback(async () => {
    if (!state || !crop || crop.w < 0.01 || crop.h < 0.01) return;
    const next = await applyCrop(state, crop);
    // After crop, baking in layers + adjustments produces a clean canvas.
    commit({
      image: next,
      adjustments: DEFAULT_ADJUSTMENTS,
      layers: [],
    });
    setCrop(null);
  }, [state, crop, commit]);

  const onRotate = useCallback(
    async (degrees: number) => {
      if (!state) return;
      const next = await applyRotate(state, degrees);
      commit({
        image: next,
        adjustments: DEFAULT_ADJUSTMENTS,
        layers: [],
      });
    },
    [state, commit],
  );

  const onFlip = useCallback(
    async (axis: "h" | "v") => {
      if (!state) return;
      const next = await applyFlip(state, axis);
      commit({
        image: next,
        adjustments: DEFAULT_ADJUSTMENTS,
        layers: [],
      });
    },
    [state, commit],
  );

  const onResize = useCallback(
    async (w: number, h: number) => {
      if (!state) return;
      const next = await applyResize(state, w, h);
      commit({
        image: next,
        adjustments: state.adjustments,
        layers: state.layers,
      });
    },
    [state, commit],
  );

  /* ---------------- export ---------------- */

  const onDownload = useCallback(
    async (format: "image/jpeg" | "image/png", quality: number) => {
      if (!state) return;
      const blob = await exportImage(state, format, quality);
      const ext = format === "image/jpeg" ? "jpg" : "png";
      downloadBlob(blob, `photo-${Date.now()}.${ext}`);
    },
    [state],
  );

  const onCopy = useCallback(async () => {
    if (!state) return;
    // PNG is the safest clipboard format
    const blob = await exportImage(state, "image/png", 1);
    await copyImageToClipboard(blob);
  }, [state]);

  const onReplace = useCallback(() => {
    setHistory(emptyHistory());
  }, []);

  /* ---------------- keyboard shortcuts ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in input
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  /* ---------------- sidebar contents ---------------- */

  const sidebar = useMemo(() => {
    if (!state) return null;
    switch (tool) {
      case "adjust":
        return (
          <div className="overflow-auto scrollbar-thin" style={{ flex: 1 }}>
            <AdjustPanel
              adjustments={state.adjustments}
              onChange={setAdjustments}
            />
          </div>
        );
      case "presets":
        return (
          <div className="overflow-auto scrollbar-thin" style={{ flex: 1 }}>
            <PresetsPanel
              image={state.image}
              onApply={applyPresetAdjustments}
            />
          </div>
        );
      case "crop":
        return (
          <div className="overflow-auto scrollbar-thin" style={{ flex: 1 }}>
            <CropPanel
              crop={crop}
              setCrop={setCrop}
              aspect={cropAspect}
              setAspect={setCropAspect}
              imageWidth={state.image.width}
              imageHeight={state.image.height}
              onApply={() => void onCropApply()}
              onCancel={() => setCrop(null)}
            />
          </div>
        );
      case "transform":
        return (
          <div className="overflow-auto scrollbar-thin" style={{ flex: 1 }}>
            <TransformPanel
              image={state.image}
              onRotate={(d) => void onRotate(d)}
              onFlip={(a) => void onFlip(a)}
              onResize={(w, h) => void onResize(w, h)}
            />
          </div>
        );
      case "text":
        return (
          <div className="overflow-auto scrollbar-thin" style={{ flex: 1 }}>
            <TextPanel
              layers={state.layers}
              setLayers={setLayers}
              selectedId={selectedLayerId}
              setSelectedId={setSelectedLayerId}
              imageWidth={state.image.width}
            />
          </div>
        );
      case "draw":
        return (
          <div className="overflow-auto scrollbar-thin" style={{ flex: 1 }}>
            <DrawPanel
              brushColor={brushColor}
              setBrushColor={setBrushColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              layers={state.layers}
              setLayers={(l) => {
                if (!state) return;
                commit({ ...state, layers: l });
              }}
            />
          </div>
        );
      case "stickers":
        return (
          <div className="overflow-auto scrollbar-thin" style={{ flex: 1 }}>
            <StickerPanel
              layers={state.layers}
              setLayers={setLayers}
              selectedId={selectedLayerId}
              setSelectedId={setSelectedLayerId}
              imageWidth={state.image.width}
            />
          </div>
        );
      case "export":
        return (
          <div className="overflow-auto scrollbar-thin" style={{ flex: 1 }}>
            <ExportPanel
              onDownload={onDownload}
              onCopy={onCopy}
              onReplace={onReplace}
            />
          </div>
        );
    }
  }, [
    state,
    tool,
    crop,
    cropAspect,
    selectedLayerId,
    brushColor,
    brushSize,
    setAdjustments,
    applyPresetAdjustments,
    onCropApply,
    onRotate,
    onFlip,
    onResize,
    setLayers,
    commit,
    onDownload,
    onCopy,
    onReplace,
  ]);

  if (!state) {
    return (
      <Shell>
        <Dropzone onLoad={(d) => void loadFromDataUrl(d)} />
      </Shell>
    );
  }

  return (
    <Shell
      toolbar={
        <Toolbar
          tool={tool}
          setTool={(t) => {
            setTool(t);
            // entering crop with no crop -> initialize one
            if (t === "crop" && !crop) setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
            // leaving crop -> reset selection
            if (t !== "crop") setCrop(null);
          }}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={undo}
          onRedo={redo}
          onCompareDown={() => setComparing(true)}
          onCompareUp={() => setComparing(false)}
        />
      }
      sidebar={sidebar}
    >
      <Editor
        image={state.image}
        adjustments={state.adjustments}
        layers={state.layers}
        setLayers={setLayers}
        tool={tool}
        crop={crop}
        setCrop={setCrop}
        cropAspect={cropAspect}
        brushColor={brushColor}
        brushSize={brushSize}
        selectedLayerId={selectedLayerId}
        setSelectedLayerId={setSelectedLayerId}
        comparing={comparing}
      />

      {/* Image info pill */}
      <div
        className="hidden sm:block"
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          padding: "0.3rem 0.65rem",
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          borderRadius: 999,
          fontSize: "0.72rem",
          fontWeight: 500,
          pointerEvents: "none",
        }}
      >
        {state.image.width} × {state.image.height} px
      </div>
    </Shell>
  );
}

export default App;
