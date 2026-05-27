import type { Adjustments } from "../types";
import { DEFAULT_ADJUSTMENTS } from "../types";
import { Btn, Section, Slider } from "./ui";

interface Props {
  adjustments: Adjustments;
  onChange: (next: Adjustments) => void;
}

const SPECS: Array<{
  key: keyof Adjustments;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}> = [
  { key: "brightness", label: "Brightness", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", min: -100, max: 100 },
  { key: "saturation", label: "Saturation", min: -100, max: 100 },
  { key: "exposure", label: "Exposure", min: -100, max: 100 },
  { key: "hue", label: "Hue", min: -180, max: 180, unit: "°" },
  { key: "blur", label: "Blur", min: 0, max: 20, unit: "px" },
  { key: "sharpen", label: "Sharpen", min: 0, max: 100 },
  { key: "vignette", label: "Vignette", min: 0, max: 100 },
  { key: "sepia", label: "Sepia", min: 0, max: 100 },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100 },
  { key: "invert", label: "Invert", min: 0, max: 100 },
];

export function AdjustPanel({ adjustments, onChange }: Props) {
  const set = (key: keyof Adjustments, v: number) =>
    onChange({ ...adjustments, [key]: v });

  return (
    <Section
      title="Adjust"
      right={
        <Btn variant="ghost" onClick={() => onChange(DEFAULT_ADJUSTMENTS)}>
          Reset all
        </Btn>
      }
    >
      {SPECS.map((spec) => (
        <Slider
          key={spec.key}
          label={spec.label}
          min={spec.min}
          max={spec.max}
          step={spec.step ?? 1}
          unit={spec.unit}
          value={adjustments[spec.key]}
          onChange={(v) => set(spec.key, v)}
          onReset={() =>
            set(spec.key, DEFAULT_ADJUSTMENTS[spec.key])
          }
        />
      ))}
    </Section>
  );
}
