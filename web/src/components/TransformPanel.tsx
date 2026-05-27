import { useEffect, useState } from "react";
import type { ImageState } from "../types";
import { Btn, IconBtn, Section, Slider } from "./ui";

interface Props {
  image: ImageState;
  onRotate: (degrees: number) => void;
  onFlip: (axis: "h" | "v") => void;
  onResize: (w: number, h: number) => void;
}

export function TransformPanel({ image, onRotate, onFlip, onResize }: Props) {
  const [freeAngle, setFreeAngle] = useState(0);
  const [unit, setUnit] = useState<"px" | "%">("px");
  const [lock, setLock] = useState(true);
  const [width, setWidth] = useState(image.width);
  const [height, setHeight] = useState(image.height);

  useEffect(() => {
    setWidth(image.width);
    setHeight(image.height);
    setFreeAngle(0);
  }, [image.width, image.height]);

  const aspect = image.width / image.height;

  const onW = (v: number) => {
    setWidth(v);
    if (lock) setHeight(Math.max(1, Math.round(v / aspect)));
  };
  const onH = (v: number) => {
    setHeight(v);
    if (lock) setWidth(Math.max(1, Math.round(v * aspect)));
  };

  const targetW =
    unit === "px" ? width : Math.max(1, Math.round((image.width * width) / 100));
  const targetH =
    unit === "px"
      ? height
      : Math.max(1, Math.round((image.height * height) / 100));

  return (
    <>
      <Section title="Rotate & flip">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <IconBtn onClick={() => onRotate(-90)} title="Rotate 90° CCW">
            ⟲ 90°
          </IconBtn>
          <IconBtn onClick={() => onRotate(90)} title="Rotate 90° CW">
            ⟳ 90°
          </IconBtn>
          <IconBtn onClick={() => onRotate(180)} title="Rotate 180°">
            180°
          </IconBtn>
          <IconBtn onClick={() => onFlip("h")} title="Flip horizontal">
            ⇋
          </IconBtn>
          <IconBtn onClick={() => onFlip("v")} title="Flip vertical">
            ⇅
          </IconBtn>
        </div>
        <div style={{ marginTop: "0.85rem" }}>
          <Slider
            label="Free rotate"
            min={-180}
            max={180}
            value={freeAngle}
            onChange={setFreeAngle}
            onReset={() => setFreeAngle(0)}
            unit="°"
          />
          <Btn
            variant="primary"
            onClick={() => {
              onRotate(freeAngle);
              setFreeAngle(0);
            }}
            disabled={freeAngle === 0}
          >
            Apply rotation
          </Btn>
        </div>
      </Section>

      <Section title="Resize">
        <div style={{ display: "flex", gap: 6, marginBottom: "0.6rem" }}>
          <IconBtn
            active={unit === "px"}
            onClick={() => {
              setUnit("px");
              setWidth(image.width);
              setHeight(image.height);
            }}
          >
            Pixels
          </IconBtn>
          <IconBtn
            active={unit === "%"}
            onClick={() => {
              setUnit("%");
              setWidth(100);
              setHeight(100);
            }}
          >
            Percent
          </IconBtn>
          <IconBtn
            active={lock}
            onClick={() => setLock(!lock)}
            title="Lock aspect ratio"
          >
            {lock ? "🔒" : "🔓"}
          </IconBtn>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label
            style={{
              fontSize: "0.78rem",
              color: "var(--color-muted)",
              minWidth: 18,
            }}
          >
            W
          </label>
          <input
            type="number"
            value={width}
            onChange={(e) => onW(Number(e.target.value) || 0)}
            style={{ width: "100%" }}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
            {unit}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: "0.4rem",
          }}
        >
          <label
            style={{
              fontSize: "0.78rem",
              color: "var(--color-muted)",
              minWidth: 18,
            }}
          >
            H
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => onH(Number(e.target.value) || 0)}
            style={{ width: "100%" }}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
            {unit}
          </span>
        </div>
        <div
          style={{
            marginTop: "0.6rem",
            fontSize: "0.72rem",
            color: "var(--color-muted)",
          }}
        >
          Result: {targetW} × {targetH} px
        </div>
        <div style={{ marginTop: "0.6rem" }}>
          <Btn
            variant="primary"
            onClick={() => onResize(targetW, targetH)}
            disabled={
              targetW === image.width && targetH === image.height
            }
          >
            Apply resize
          </Btn>
        </div>
      </Section>
    </>
  );
}
