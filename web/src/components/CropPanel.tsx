import type { CropRect } from "../types";
import { Btn, IconBtn, Section } from "./ui";

interface Props {
  crop: CropRect | null;
  setCrop: (c: CropRect | null) => void;
  aspect: number | null; // null = free; pixel-space W/H
  setAspect: (a: number | null) => void;
  imageWidth: number;
  imageHeight: number;
  onApply: () => void;
  onCancel: () => void;
}

const ASPECTS: Array<{ label: string; value: number | null }> = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "3:2", value: 3 / 2 },
];

export function CropPanel({
  crop,
  setCrop,
  aspect,
  setAspect,
  imageWidth,
  imageHeight,
  onApply,
  onCancel,
}: Props) {
  return (
    <Section title="Crop">
      <p
        style={{
          fontSize: "0.78rem",
          color: "var(--color-muted)",
          marginTop: 0,
          marginBottom: "0.5rem",
        }}
      >
        Drag on the image to set a crop region. Pull handles to resize.
      </p>

      <label
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "var(--color-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Aspect ratio
      </label>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: "0.4rem",
          marginBottom: "0.85rem",
        }}
      >
        {ASPECTS.map((a) => (
          <IconBtn
            key={a.label}
            active={a.value === aspect}
            onClick={() => {
              setAspect(a.value);
              if (a.value && crop) {
                // a.value is W/H in pixel space; convert to normalized aspect
                const aN = a.value * (imageHeight / imageWidth);
                const w = crop.w;
                const h = w / aN;
                setCrop({
                  ...crop,
                  w,
                  h: Math.min(1 - crop.y, h),
                });
              }
            }}
          >
            {a.label}
          </IconBtn>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="primary" onClick={onApply} disabled={!crop}>
          Apply crop
        </Btn>
        <Btn variant="outline" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </Section>
  );
}
