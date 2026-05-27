import type { Layer } from "../types";
import { Btn, Section, Slider } from "./ui";

interface Props {
  brushColor: string;
  setBrushColor: (c: string) => void;
  brushSize: number;
  setBrushSize: (n: number) => void;
  layers: Layer[];
  setLayers: (l: Layer[]) => void;
}

export function DrawPanel({
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  layers,
  setLayers,
}: Props) {
  const drawLayers = layers.filter((l) => l.kind === "draw");

  const clearDrawing = () => {
    setLayers(layers.filter((l) => l.kind !== "draw"));
  };

  const undoLastStroke = () => {
    // pop last stroke from the last draw layer
    const next = [...layers];
    for (let i = next.length - 1; i >= 0; i--) {
      const layer = next[i];
      if (layer && layer.kind === "draw" && layer.strokes.length > 0) {
        const newStrokes = layer.strokes.slice(0, -1);
        if (newStrokes.length === 0) {
          next.splice(i, 1);
        } else {
          next[i] = { ...layer, strokes: newStrokes };
        }
        setLayers(next);
        return;
      }
    }
  };

  return (
    <Section title="Draw">
      <p
        style={{
          fontSize: "0.78rem",
          color: "var(--color-muted)",
          marginTop: 0,
          marginBottom: "0.6rem",
        }}
      >
        Drag on the image to paint with the brush.
      </p>

      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <label
          style={{
            fontSize: "0.78rem",
            color: "var(--color-muted)",
            minWidth: 40,
          }}
        >
          Color
        </label>
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          style={{
            width: 44,
            height: 34,
            background: "transparent",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-btn)",
            cursor: "pointer",
            padding: 2,
          }}
        />
        <input
          type="text"
          value={brushColor}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-f]{6}$/i.test(v)) setBrushColor(v);
            else setBrushColor(v);
          }}
          maxLength={7}
          style={{ flex: 1, fontFamily: "var(--font-body)" }}
        />
      </div>

      <Slider
        label="Brush size"
        min={1}
        max={100}
        value={brushSize}
        onChange={setBrushSize}
        unit="px"
      />

      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          variant="outline"
          onClick={undoLastStroke}
          disabled={drawLayers.length === 0}
        >
          Undo stroke
        </Btn>
        <Btn
          variant="danger"
          onClick={clearDrawing}
          disabled={drawLayers.length === 0}
        >
          Clear drawing
        </Btn>
      </div>
    </Section>
  );
}
