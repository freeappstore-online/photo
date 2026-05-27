import type { Layer, StickerLayer } from "../types";
import { Btn, IconBtn, Section, Slider } from "./ui";

interface Props {
  layers: Layer[];
  setLayers: (l: Layer[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  imageWidth: number;
}

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😎", "🥳", "🤩", "😘",
  "😢", "😡", "🤔", "🙄", "😴", "🤯", "🤗", "🥰", "😇", "🥺",
  "❤️", "💔", "💖", "💕", "💜", "💙", "💚", "💛", "🧡", "🤍",
  "⭐", "🌟", "✨", "🔥", "💧", "🌈", "☀️", "🌙", "⚡", "❄️",
  "🌸", "🌺", "🌹", "🌻", "🌷", "🌼", "🍀", "🌴", "🌵", "🍄",
  "🎉", "🎊", "🎈", "🎁", "🎂", "🍰", "🍕", "🍔", "🍟", "🍣",
  "🍎", "🍌", "🍓", "🍇", "🍊", "🥑", "🍑", "🍉", "🥥", "🍒",
  "🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁",
  "🐸", "🐵", "🐙", "🐠", "🐬", "🦄", "🐝", "🦋", "🐢", "🐳",
  "⚽", "🏀", "🏈", "⚾", "🎾", "🎮", "🎲", "🎯", "🎨", "🎬",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "✌️", "🤞", "🤘", "👌",
  "💯", "✅", "❌", "❓", "❗", "⚠️", "🚀", "✈️", "🚗", "🏆",
];

function newId(): string {
  return `s_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function StickerPanel({
  layers,
  setLayers,
  selectedId,
  setSelectedId,
  imageWidth,
}: Props) {
  const stickers = layers.filter(
    (l): l is StickerLayer => l.kind === "sticker",
  );
  const selected = stickers.find((l) => l.id === selectedId) ?? null;

  const addSticker = (emoji: string) => {
    const s: StickerLayer = {
      id: newId(),
      kind: "sticker",
      emoji,
      x: 0.5,
      y: 0.5,
      size: Math.max(48, Math.round(imageWidth / 8)),
      rotation: 0,
    };
    setLayers([...layers, s]);
    setSelectedId(s.id);
  };

  const update = (patch: Partial<StickerLayer>) => {
    if (!selected) return;
    setLayers(
      layers.map((l) =>
        l.id === selected.id && l.kind === "sticker" ? { ...l, ...patch } : l,
      ),
    );
  };

  const remove = () => {
    if (!selected) return;
    setLayers(layers.filter((l) => l.id !== selected.id));
    setSelectedId(null);
  };

  return (
    <Section title="Stickers">
      <div
        className="scrollbar-thin"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gap: 4,
          maxHeight: "11rem",
          overflowY: "auto",
          marginBottom: "0.75rem",
          paddingRight: 4,
        }}
      >
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => addSticker(e)}
            style={{
              background: "transparent",
              border: "1px solid transparent",
              fontSize: "1.35rem",
              cursor: "pointer",
              padding: "0.2rem",
              borderRadius: "var(--radius-btn)",
              lineHeight: 1,
            }}
            onMouseEnter={(ev) =>
              ((ev.target as HTMLButtonElement).style.background =
                "var(--color-line)")
            }
            onMouseLeave={(ev) =>
              ((ev.target as HTMLButtonElement).style.background = "transparent")
            }
            title={`Add ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      {stickers.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginBottom: "0.6rem",
          }}
        >
          {stickers.map((s) => (
            <IconBtn
              key={s.id}
              active={s.id === selectedId}
              onClick={() => setSelectedId(s.id)}
            >
              {s.emoji}
            </IconBtn>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Slider
            label="Size"
            min={16}
            max={Math.max(400, Math.round(imageWidth / 2))}
            value={selected.size}
            onChange={(v) => update({ size: v })}
            unit="px"
          />
          <Slider
            label="Rotation"
            min={-180}
            max={180}
            value={selected.rotation}
            onChange={(v) => update({ rotation: v })}
            unit="°"
          />
          <Btn variant="danger" onClick={remove}>
            Delete sticker
          </Btn>
        </div>
      )}
    </Section>
  );
}
