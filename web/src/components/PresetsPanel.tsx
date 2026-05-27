import { useEffect, useRef, useState } from "react";
import type { Adjustments, ImageState } from "../types";
import { PRESETS, applyPreset, type Preset } from "../presets";
import { filterString, loadImage, get2d } from "../image";
import { Section } from "./ui";

interface Props {
  image: ImageState;
  onApply: (next: Adjustments) => void;
}

const THUMB_SIZE = 84;

export function PresetsPanel({ image, onApply }: Props) {
  const [thumb, setThumb] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const img = await loadImage(image.baseDataUrl);
      if (cancelled) return;
      setThumb(img);
    })();
    return () => {
      cancelled = true;
    };
  }, [image.baseDataUrl]);

  return (
    <Section title="Presets">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {PRESETS.map((p) => (
          <PresetCard
            key={p.id}
            preset={p}
            baseImage={thumb}
            onClick={() => onApply(applyPreset(p))}
          />
        ))}
      </div>
    </Section>
  );
}

function PresetCard({
  preset,
  baseImage,
  onClick,
}: {
  preset: Preset;
  baseImage: HTMLImageElement | null;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!baseImage) return;
    const c = canvasRef.current;
    if (!c) return;
    c.width = THUMB_SIZE;
    c.height = THUMB_SIZE;
    const ctx = get2d(c);
    const adj = applyPreset(preset);
    // Center-crop the source into a square
    const sw = baseImage.naturalWidth;
    const sh = baseImage.naturalHeight;
    const side = Math.min(sw, sh);
    const sx = (sw - side) / 2;
    const sy = (sh - side) / 2;
    ctx.save();
    ctx.filter = filterString(adj);
    ctx.drawImage(baseImage, sx, sy, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE);
    ctx.restore();
    if (adj.vignette > 0) {
      const grd = ctx.createRadialGradient(
        THUMB_SIZE / 2,
        THUMB_SIZE / 2,
        THUMB_SIZE * 0.25,
        THUMB_SIZE / 2,
        THUMB_SIZE / 2,
        THUMB_SIZE * 0.55,
      );
      const a = (adj.vignette / 100) * 0.7;
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(1, `rgba(0,0,0,${a})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
    }
  }, [baseImage, preset]);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "var(--color-paper)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-btn)",
        overflow: "hidden",
        padding: 0,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          background: "var(--color-line)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </div>
      <div
        style={{
          padding: "0.3rem 0.4rem",
          fontSize: "0.72rem",
          fontWeight: 600,
          textAlign: "center",
          fontFamily: "var(--font-body)",
        }}
      >
        {preset.name}
      </div>
    </button>
  );
}
