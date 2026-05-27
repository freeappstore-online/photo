import type { Layer, TextLayer } from "../types";
import { Btn, IconBtn, Section, Slider } from "./ui";

interface Props {
  layers: Layer[];
  setLayers: (l: Layer[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  imageWidth: number;
}

const FONTS = [
  "Manrope",
  "Fraunces",
  "Georgia",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Impact",
];

function newId(): string {
  return `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function TextPanel({
  layers,
  setLayers,
  selectedId,
  setSelectedId,
  imageWidth,
}: Props) {
  const textLayers = layers.filter(
    (l): l is TextLayer => l.kind === "text",
  );
  const selected = textLayers.find((l) => l.id === selectedId) ?? null;

  const addText = () => {
    const t: TextLayer = {
      id: newId(),
      kind: "text",
      text: "Your text",
      x: 0.1,
      y: 0.1,
      fontSize: Math.max(24, Math.round(imageWidth / 18)),
      fontFamily: "Manrope",
      color: "#ffffff",
      bold: true,
      italic: false,
    };
    setLayers([...layers, t]);
    setSelectedId(t.id);
  };

  const update = (patch: Partial<TextLayer>) => {
    if (!selected) return;
    setLayers(
      layers.map((l) =>
        l.id === selected.id && l.kind === "text" ? { ...l, ...patch } : l,
      ),
    );
  };

  const remove = () => {
    if (!selected) return;
    setLayers(layers.filter((l) => l.id !== selected.id));
    setSelectedId(null);
  };

  return (
    <Section
      title="Text"
      right={
        <Btn variant="primary" onClick={addText}>
          + Add text
        </Btn>
      }
    >
      {textLayers.length === 0 && (
        <p style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
          No text layers. Tap "Add text" to begin.
        </p>
      )}
      {textLayers.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" }}>
          {textLayers.map((t) => (
            <IconBtn
              key={t.id}
              active={t.id === selectedId}
              onClick={() => setSelectedId(t.id)}
              title={t.text}
            >
              {t.text.slice(0, 8) || "(text)"}
            </IconBtn>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          <input
            type="text"
            value={selected.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Text"
          />

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={selected.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              style={{
                flex: 1,
                background: "var(--color-panel)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-line)",
                borderRadius: "var(--radius-btn)",
                padding: "0.4rem 0.5rem",
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
              }}
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <input
              type="color"
              value={selected.color}
              onChange={(e) => update({ color: e.target.value })}
              style={{
                width: 36,
                height: 34,
                background: "transparent",
                border: "1px solid var(--color-line)",
                borderRadius: "var(--radius-btn)",
                cursor: "pointer",
                padding: 2,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <IconBtn
              active={selected.bold}
              onClick={() => update({ bold: !selected.bold })}
              title="Bold"
            >
              <strong>B</strong>
            </IconBtn>
            <IconBtn
              active={selected.italic}
              onClick={() => update({ italic: !selected.italic })}
              title="Italic"
            >
              <em>I</em>
            </IconBtn>
          </div>

          <Slider
            label="Size"
            min={8}
            max={Math.max(200, Math.round(imageWidth / 3))}
            value={selected.fontSize}
            onChange={(v) => update({ fontSize: v })}
            unit="px"
          />

          <Btn variant="danger" onClick={remove}>
            Delete text
          </Btn>
        </div>
      )}
    </Section>
  );
}
