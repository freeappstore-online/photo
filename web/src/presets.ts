import type { Adjustments } from "./types";
import { DEFAULT_ADJUSTMENTS } from "./types";

export interface Preset {
  id: string;
  name: string;
  adjustments: Partial<Adjustments>;
}

export const PRESETS: Preset[] = [
  {
    id: "vintage",
    name: "Vintage",
    adjustments: {
      sepia: 35,
      saturation: -15,
      contrast: 10,
      brightness: -5,
      vignette: 30,
    },
  },
  {
    id: "bw",
    name: "B&W",
    adjustments: {
      grayscale: 100,
      contrast: 15,
    },
  },
  {
    id: "cool",
    name: "Cool",
    adjustments: {
      hue: -15,
      saturation: 10,
      brightness: 5,
      contrast: 5,
    },
  },
  {
    id: "warm",
    name: "Warm",
    adjustments: {
      hue: 12,
      saturation: 15,
      brightness: 5,
      sepia: 10,
    },
  },
  {
    id: "drama",
    name: "Drama",
    adjustments: {
      contrast: 35,
      saturation: 20,
      brightness: -5,
      vignette: 25,
      sharpen: 30,
    },
  },
  {
    id: "soft",
    name: "Soft",
    adjustments: {
      brightness: 8,
      contrast: -10,
      saturation: -10,
      blur: 1,
    },
  },
  {
    id: "vivid",
    name: "Vivid",
    adjustments: {
      saturation: 40,
      contrast: 15,
      brightness: 3,
      sharpen: 15,
    },
  },
  {
    id: "faded",
    name: "Faded",
    adjustments: {
      contrast: -20,
      saturation: -30,
      brightness: 10,
      exposure: 8,
    },
  },
  {
    id: "noir",
    name: "Noir",
    adjustments: {
      grayscale: 100,
      contrast: 30,
      brightness: -10,
      vignette: 45,
    },
  },
  {
    id: "cinematic",
    name: "Cinematic",
    adjustments: {
      contrast: 25,
      saturation: -5,
      hue: -8,
      vignette: 20,
      exposure: -5,
    },
  },
];

export function applyPreset(p: Preset): Adjustments {
  return { ...DEFAULT_ADJUSTMENTS, ...p.adjustments };
}
