export interface Adjustments {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  hue: number; // -180..180
  blur: number; // 0..20 (px)
  sharpen: number; // 0..100 (0 off, 100 max)
  vignette: number; // 0..100
  sepia: number; // 0..100
  grayscale: number; // 0..100
  invert: number; // 0..100
  exposure: number; // -100..100 (gamma)
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  sharpen: 0,
  vignette: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
  exposure: 0,
};

export interface TextLayer {
  id: string;
  kind: "text";
  text: string;
  x: number; // 0..1 (relative to image)
  y: number;
  fontSize: number; // px in image space
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface StickerLayer {
  id: string;
  kind: "sticker";
  emoji: string;
  x: number;
  y: number;
  size: number; // px in image space
  rotation: number; // degrees
}

export interface BrushStroke {
  color: string;
  size: number; // px in image space
  points: Array<{ x: number; y: number }>; // 0..1 normalized
}

export interface DrawLayer {
  id: string;
  kind: "draw";
  strokes: BrushStroke[];
}

export type Layer = TextLayer | StickerLayer | DrawLayer;

export interface CropRect {
  x: number; // 0..1
  y: number;
  w: number;
  h: number;
}

export type Tool =
  | "adjust"
  | "presets"
  | "crop"
  | "transform"
  | "text"
  | "draw"
  | "stickers"
  | "export";

export interface ImageState {
  // The current "base" image after any committed crops/rotations/resizes.
  // Held in an off-screen canvas (we keep its data URL for snapshotting in history).
  width: number;
  height: number;
  // base image as data URL (PNG, lossless for editing)
  baseDataUrl: string;
}

export interface EditorState {
  image: ImageState;
  adjustments: Adjustments;
  layers: Layer[];
}
