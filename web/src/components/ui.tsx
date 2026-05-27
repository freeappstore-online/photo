import type { ChangeEvent, CSSProperties, ReactNode } from "react";

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section style={{ padding: "1rem 1rem 0.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.95rem",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onReset,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onReset?: () => void;
  unit?: string;
}) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.25rem",
        }}
      >
        <label
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--color-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--color-ink)",
              minWidth: 32,
              textAlign: "right",
            }}
          >
            {value}
            {unit ?? ""}
          </span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-muted)",
                fontSize: "0.7rem",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ⟲
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(e.target.value))
        }
        style={{ width: "100%" }}
      />
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  disabled,
  title,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "danger";
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
}) {
  const variants: Record<string, CSSProperties> = {
    primary: {
      background: "var(--color-accent)",
      color: "#fff",
      border: "1px solid var(--color-accent)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-ink)",
      border: "1px solid transparent",
    },
    outline: {
      background: "var(--color-paper)",
      color: "var(--color-ink)",
      border: "1px solid var(--color-line)",
    },
    danger: {
      background: "transparent",
      color: "#e11d48",
      border: "1px solid var(--color-line)",
    },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...variants[variant],
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: "var(--radius-btn)",
        padding: "0.45rem 0.75rem",
        fontSize: "0.82rem",
        fontWeight: 600,
        fontFamily: "var(--font-body)",
        transition: "background 0.15s, opacity 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: active ? "var(--color-accent)" : "transparent",
        color: active ? "#fff" : "var(--color-ink)",
        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-line)"}`,
        borderRadius: "var(--radius-btn)",
        padding: "0.45rem 0.55rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        minWidth: 38,
        height: 34,
      }}
    >
      {children}
    </button>
  );
}
