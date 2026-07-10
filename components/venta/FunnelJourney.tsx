"use client";

import type { FunnelStage } from "@/lib/ventaGraficas";
import { useDrilldown } from "../DrillDown";

const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export function FunnelJourney({ stages }: { stages: FunnelStage[] }) {
  const { open } = useDrilldown();
  const top = stages.length ? Math.max(1, stages[0].alcanzaron) : 1;

  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-spectrum-gradient" />
        <h3 className="text-sm font-semibold text-ink">Recorrido del journey (incluye perdidos por su etapa máxima)</h3>
      </div>

      <div className="space-y-1.5">
        {stages.map((s, i) => {
          const w = Math.round((s.alcanzaron / top) * 100);
          const lowConv = s.conv != null && i > 0 && s.conv < 0.5;
          return (
            <button
              key={s.rank}
              type="button"
              onClick={() => open(s.drill)}
              className="group flex w-full items-center gap-3 rounded-md text-left transition-colors hover:bg-canvas"
            >
              <span className="w-40 shrink-0 truncate py-1 pl-1 text-xs font-medium text-ink-muted">{s.etapa}</span>
              <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-canvas">
                <div
                  className="h-full rounded-md bg-[#3FA9FF] transition-all duration-500 group-hover:bg-[#2E93E6]"
                  style={{ width: `${w}%` }}
                />
                <span className="absolute inset-y-0 left-2.5 flex items-center text-xs font-bold tabular-nums text-ink">
                  {s.alcanzaron}
                </span>
              </div>
              <span
                className={`w-28 shrink-0 pr-1 text-right text-[11px] tabular-nums ${
                  lowConv ? "font-semibold text-[#C23B3A]" : "text-ink-muted"
                }`}
              >
                {i === 0 ? "inicio" : `conv ${pct(s.conv)}`}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-ink-muted">
        Embudo acumulativo: cuántos deals alcanzaron cada etapa o más. Los perdidos cuentan por su etapa máxima. Clic
        en una etapa para ver esos deals.
      </p>
    </div>
  );
}
