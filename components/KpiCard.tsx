"use client";

import type { Kpi } from "@/lib/types";
import { getSemaforo, NEUTRAL } from "@/lib/semaforo";
import { TentativoBadge } from "./Badge";
import { useDrilldown } from "./DrillDown";

function fmt(value: number, unit?: Kpi["unit"]) {
  if (unit === "money")
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);
  if (unit === "pct") return `${Math.round(value * 100)}%`;
  return new Intl.NumberFormat("es-MX").format(value);
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const { open } = useDrilldown();
  const hasMeta = typeof kpi.meta === "number" && kpi.meta! > 0;
  const rawPct = hasMeta ? Math.round((kpi.value / (kpi.meta as number)) * 100) : 0;
  const barPct = Math.min(100, rawPct);
  const sem = hasMeta ? getSemaforo(rawPct) : null;
  const leftColor = sem ? sem.color : NEUTRAL;
  const clickable = !!kpi.drill;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => kpi.drill && open(kpi.drill)}
      style={{ borderLeftColor: leftColor, borderLeftWidth: 4 }}
      className={`group relative flex w-full flex-col rounded-xl border border-line bg-card p-4 text-left shadow-card transition-all duration-200 ${
        clickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-cardhover" : "cursor-default"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{kpi.label}</span>
        {kpi.tentativo && <TentativoBadge />}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-ink">{fmt(kpi.value, kpi.unit)}</span>
        {hasMeta && <span className="text-sm text-ink-muted">/ {fmt(kpi.meta as number, kpi.unit)}</span>}
      </div>

      {hasMeta && sem ? (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-line/70">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: sem.color }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: sem.color, backgroundColor: sem.soft }}
            >
              <span aria-hidden>{sem.icon}</span>
              {sem.label} {rawPct}%
            </span>
            {kpi.hint && (
              <span className="max-w-[52%] truncate text-[11px] text-ink-muted" title={kpi.hint}>
                {kpi.hint}
              </span>
            )}
          </div>
        </div>
      ) : (
        kpi.hint && <p className="mt-2 text-[11px] leading-snug text-ink-muted">{kpi.hint}</p>
      )}

      {clickable && (
        <span className="pointer-events-none absolute right-3 top-3 text-xs text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
          ↗
        </span>
      )}
    </button>
  );
}
