import { useState } from "react";
import { Btn, Section, Slider } from "./ui";

interface Props {
  onDownload: (format: "image/jpeg" | "image/png", quality: number) => Promise<void>;
  onCopy: () => Promise<void>;
  onReplace: () => void;
}

export function ExportPanel({ onDownload, onCopy, onReplace }: Props) {
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <Section title="Export">
      <div style={{ display: "flex", gap: 6, marginBottom: "0.8rem" }}>
        <button
          type="button"
          onClick={() => setFormat("image/jpeg")}
          style={{
            flex: 1,
            background: format === "image/jpeg" ? "var(--color-accent)" : "var(--color-paper)",
            color: format === "image/jpeg" ? "#fff" : "var(--color-ink)",
            border: `1px solid ${
              format === "image/jpeg" ? "var(--color-accent)" : "var(--color-line)"
            }`,
            borderRadius: "var(--radius-btn)",
            padding: "0.5rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          JPEG
        </button>
        <button
          type="button"
          onClick={() => setFormat("image/png")}
          style={{
            flex: 1,
            background: format === "image/png" ? "var(--color-accent)" : "var(--color-paper)",
            color: format === "image/png" ? "#fff" : "var(--color-ink)",
            border: `1px solid ${
              format === "image/png" ? "var(--color-accent)" : "var(--color-line)"
            }`,
            borderRadius: "var(--radius-btn)",
            padding: "0.5rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          PNG
        </button>
      </div>

      {format === "image/jpeg" && (
        <Slider
          label="JPEG quality"
          min={1}
          max={100}
          value={quality}
          onChange={setQuality}
          unit="%"
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "0.4rem" }}>
        <Btn
          variant="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onDownload(format, quality / 100);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Working…" : "Download"}
        </Btn>
        <Btn
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onCopy();
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } finally {
              setBusy(false);
            }
          }}
        >
          {copied ? "Copied!" : "Copy to clipboard"}
        </Btn>
        <Btn variant="ghost" onClick={onReplace}>
          Load a different photo
        </Btn>
      </div>

      <p
        style={{
          fontSize: "0.72rem",
          color: "var(--color-muted)",
          marginTop: "0.85rem",
          marginBottom: 0,
        }}
      >
        Everything is processed in your browser. No uploads, no tracking.
      </p>
    </Section>
  );
}
