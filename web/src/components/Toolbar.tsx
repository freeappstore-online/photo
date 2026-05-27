import type { Tool } from "../types";
import { IconBtn } from "./ui";

interface Props {
  tool: Tool;
  setTool: (t: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCompareDown: () => void;
  onCompareUp: () => void;
}

const TOOLS: Array<{ key: Tool; label: string; glyph: string }> = [
  { key: "adjust", label: "Adjust", glyph: "🎚️" },
  { key: "presets", label: "Presets", glyph: "✨" },
  { key: "crop", label: "Crop", glyph: "▫️" },
  { key: "transform", label: "Transform", glyph: "↻" },
  { key: "text", label: "Text", glyph: "T" },
  { key: "draw", label: "Draw", glyph: "✏️" },
  { key: "stickers", label: "Stickers", glyph: "😀" },
  { key: "export", label: "Export", glyph: "⤓" },
];

export function Toolbar({
  tool,
  setTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCompareDown,
  onCompareUp,
}: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <IconBtn onClick={onUndo} disabled={!canUndo} title="Undo">
        ↺
      </IconBtn>
      <IconBtn onClick={onRedo} disabled={!canRedo} title="Redo">
        ↻
      </IconBtn>
      <button
        onPointerDown={onCompareDown}
        onPointerUp={onCompareUp}
        onPointerLeave={onCompareUp}
        onPointerCancel={onCompareUp}
        title="Hold to compare with original"
        style={{
          background: "transparent",
          color: "var(--color-ink)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-btn)",
          padding: "0.45rem 0.65rem",
          fontSize: "0.78rem",
          fontWeight: 600,
          cursor: "pointer",
          height: 34,
          fontFamily: "var(--font-body)",
        }}
      >
        Compare
      </button>

      <div
        className="hidden md:flex"
        style={{
          marginLeft: 8,
          display: "flex",
          gap: 4,
          borderLeft: "1px solid var(--color-line)",
          paddingLeft: 12,
        }}
      >
        {TOOLS.map((t) => (
          <IconBtn
            key={t.key}
            active={tool === t.key}
            onClick={() => setTool(t.key)}
            title={t.label}
          >
            <span style={{ marginRight: 4 }}>{t.glyph}</span>
            <span style={{ fontSize: "0.75rem" }}>{t.label}</span>
          </IconBtn>
        ))}
      </div>

      <select
        className="md:hidden"
        value={tool}
        onChange={(e) => setTool(e.target.value as Tool)}
        style={{
          marginLeft: 6,
          background: "var(--color-paper)",
          color: "var(--color-ink)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-btn)",
          padding: "0.4rem 0.5rem",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: "0.82rem",
        }}
      >
        {TOOLS.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
