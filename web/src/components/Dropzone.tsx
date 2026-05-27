import { useCallback, useEffect, useRef, useState } from "react";

interface DropzoneProps {
  onLoad: (dataUrl: string) => void;
}

export function Dropzone({ onLoad }: DropzoneProps) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = () => {
        const result = String(r.result);
        if (result.startsWith("data:image")) onLoad(result);
      };
      r.readAsDataURL(file);
    },
    [onLoad],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!;
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            readFile(f);
            e.preventDefault();
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [readFile]);

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) readFile(f);
      }}
      className="flex flex-col items-center justify-center w-full h-full"
      style={{
        padding: "2rem",
      }}
    >
      <div
        className="flex flex-col items-center justify-center text-center cursor-pointer"
        onClick={() => inputRef.current?.click()}
        style={{
          width: "min(90vw, 32rem)",
          padding: "3rem 2rem",
          borderRadius: "var(--radius-card)",
          border: `2px dashed ${
            over ? "var(--color-accent)" : "var(--color-line)"
          }`,
          background: over ? "rgba(236,72,153,0.06)" : "var(--color-panel)",
          transition: "all 0.15s",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
            color: "#fff",
            fontSize: 28,
          }}
        >
          {/* Camera icon */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 700,
            margin: 0,
            marginBottom: "0.5rem",
          }}
        >
          Drop a photo to edit
        </h2>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--color-muted)",
            margin: 0,
            marginBottom: "1.5rem",
          }}
        >
          Drag and drop, click to choose, or paste from clipboard.
          <br />
          Everything stays in your browser — nothing uploaded.
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          style={{
            background: "var(--color-accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-btn)",
            padding: "0.65rem 1.25rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Choose photo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
