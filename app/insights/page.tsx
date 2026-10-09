"use client";

import { useMemo } from "react";
import { Topbar } from "@/components/Topbar";
import { PageBody } from "@/components/PageBody";
import { InsightsChat } from "@/components/InsightsChat";
import { LoadingBlock, ErrorBlock } from "@/components/DataState";
import { DrillButton } from "@/components/ui";
import { useAsync } from "@/lib/useAsync";
import { fetchInsightsRaw, buildInsights, type Insight } from "@/lib/insights";

const TONE: Record<Insight["sev"], { borde: string; chip: string; icon: string }> = {
  warn: { borde: "#EF9F27", chip: "bg-semaforo-amber/15 text-[#B9770F]", icon: "⚠" },
  info: { borde: "#3FA9FF", chip: "bg-spectrum-blue/10 text-[#2478C7]", icon: "ℹ" },
  ok: { borde: "#1D9E75", chip: "bg-semaforo-green/15 text-[#158060]", icon: "✓" },
};

export default function InsightsPage() {
  const { loading, error, data: raw } = useAsync(fetchInsightsRaw);
  const insights = useMemo(() => (raw ? buildInsights(raw) : []), [raw]);

  return (
    <>
      <Topbar title="Insights" subtitle="Qué atender hoy, calculado con los datos reales del mes en curso. Y un chat para preguntar lo que sea." />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">Alertas y avances del mes</h2>
            {loading && <LoadingBlock label="Calculando insights…" />}
            {error && <ErrorBlock message={error} />}
            {insights.map((ins) => {
              const t = TONE[ins.sev];
              return (
                <div
                  key={ins.id}
                  className="rounded-xl border border-line bg-card p-4 shadow-card"
                  style={{ borderLeft: `4px solid ${t.borde}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.chip}`}>
                        {t.icon} {ins.tag}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-ink">{ins.titulo}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{ins.texto}</p>
                    </div>
                    {ins.drill && <DrillButton drill={ins.drill} label="Ver" />}
                  </div>
                </div>
              );
            })}
            {!loading && !error && (
              <p className="text-[11px] text-ink-muted">
                Reglas fijas sobre datos de Supabase (sin IA): ritmo vs meta, datos faltantes en Pipedrive, deals atorados
                y mezcla de pipelines.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">Pregúntale a la IA</h2>
            <InsightsChat />
          </section>
        </div>
      </PageBody>
    </>
  );
}
