"use client";

// Arquitectura de drill-down: un provider global expone open(payload).
// Cualquier KPI/gráfica hace clic -> abre un panel lateral con las filas que
// componen el número (filas reales de Supabase).

import { createContext, useCallback, useContext, useState } from "react";
import type { DrillPayload } from "@/lib/types";
import { DataTable } from "./DataTable";

type Ctx = { open: (p: DrillPayload) => void };
const DrillCtx = createContext<Ctx>({ open: () => {} });

export function useDrilldown() {
  return useContext(DrillCtx);
}

export function DrillProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<DrillPayload | null>(null);
  const open = useCallback((p: DrillPayload) => setPayload(p), []);
  const close = useCallback(() => setPayload(null), []);

  return (
    <DrillCtx.Provider value={{ open }}>
      {children}

      <div
        className={`fixed inset-0 z-40 transition ${payload ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!payload}
      >
        {/* backdrop */}
        <div
          onClick={close}
          className={`absolute inset-0 bg-ink/25 backdrop-blur-[1px] transition-opacity ${payload ? "opacity-100" : "opacity-0"}`}
        />
        {/* drawer */}
        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-line bg-canvas shadow-2xl transition-transform duration-300 ${
            payload ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {payload && (
            <>
              <span className="h-1 w-full bg-spectrum-gradient" />
              <header className="flex items-start justify-between border-b border-line bg-card px-6 py-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#3FA9FF]">Detalle</div>
                  <h2 className="mt-0.5 text-lg font-bold text-ink">{payload.title}</h2>
                  {payload.subtitle && <p className="mt-0.5 text-sm text-ink-muted">{payload.subtitle}</p>}
                </div>
                <button
                  onClick={close}
                  className="rounded-md border border-line bg-card px-2.5 py-1 text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </header>
              <div className="flex-1 overflow-auto px-6 py-4">
                <DataTable columns={payload.columns} rows={payload.rows} />
              </div>
            </>
          )}
        </aside>
      </div>
    </DrillCtx.Provider>
  );
}
