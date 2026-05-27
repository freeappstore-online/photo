import type { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
  toolbar?: ReactNode;
}

export function Shell({ children, sidebar, toolbar }: ShellProps) {
  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--color-paper)" }}>
      <header
        className="flex items-center justify-between px-4 md:px-6 h-14 border-b shrink-0"
        style={{
          borderColor: "var(--color-line)",
          background: "var(--color-panel)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-bold text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Photo Editor
          </span>
          <span
            className="hidden sm:inline text-xs"
            style={{ color: "var(--color-muted)" }}
          >
            in-browser, private, free
          </span>
        </div>
        <div className="flex items-center gap-3">{toolbar}</div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden flex items-center justify-center relative">
          {children}
        </main>
        {sidebar && (
          <aside
            className="hidden md:flex flex-col border-l shrink-0 overflow-hidden"
            style={{
              width: "20rem",
              borderColor: "var(--color-line)",
              background: "var(--color-panel)",
            }}
          >
            {sidebar}
          </aside>
        )}
      </div>

      {sidebar && (
        <div
          className="md:hidden border-t shrink-0 overflow-hidden"
          style={{
            borderColor: "var(--color-line)",
            background: "var(--color-panel)",
            maxHeight: "50vh",
          }}
        >
          {sidebar}
        </div>
      )}
    </div>
  );
}
