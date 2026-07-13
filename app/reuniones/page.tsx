"use client";

import { Topbar } from "@/components/Topbar";
import { PageBody, SectionTitle } from "@/components/PageBody";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { Pill } from "@/components/Badge";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataState";
import { useAsync } from "@/lib/useAsync";
import { useFilters } from "@/lib/filters";
import { fetchReunionesRaw, buildReuniones } from "@/lib/reuniones";
import { useMemo } from "react";

export default function ReunionesPage() {
  const { loading, error, data: raw } = useAsync(fetchReunionesRaw);
  const { filters, activeCount } = useFilters();
  const data = useMemo(
    () => (raw ? buildReuniones(raw.reuniones, raw.metas, filters) : null),
    [raw, filters]
  );

  return (
    <>
      <Topbar title="Reuniones" />
      <PageBody>
        <div className="flex items-center gap-2">
          <Pill tone="ok">sección central</Pill>
          <span className="text-xs text-ink-muted">
            La métrica principal es <strong className="text-ink">reuniones calificadas realizadas vs meta</strong> (la reunión ocurrió Y calificó).
          </span>
        </div>

        {loading && <LoadingBlock label="Cargando reuniones desde Supabase…" />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && data && (
          <>
            {data.isEmpty && (
              <Pill tone="warn">
                {activeCount > 0 ? "Sin resultados para este filtro" : "v_reuniones sin filas — se muestran metas y ceros"}
              </Pill>
            )}
            {data.periodoNota && (
              <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <Pill tone="info">periodo</Pill> {data.periodoNota}
              </p>
            )}

            <section>
              <SectionTitle>Métrica principal</SectionTitle>
              <div className="mt-3">
                {data.kpis[0] && <KpiCard kpi={data.kpis[0]} />}
              </div>
              {data.calificacionPendiente && (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <Pill tone="warn">pendiente CRM</Pill>
                  Las calificadas se contarán cuando el equipo confirme{" "}
                  <strong className="text-ink">&quot;graban llamadas&quot;</strong> en Pipedrive (calificación
                  estricta). El <strong className="text-ink">0</strong> = dato faltante, no bajo desempeño.
                </p>
              )}
            </section>

            <section>
              <SectionTitle>Indicadores de apoyo</SectionTitle>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.kpis.slice(1).map((k) => (
                  <KpiCard key={k.id} kpi={k} />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Desglose por persona y canal</SectionTitle>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {data.porPersona ? <ChartCard spec={data.porPersona} /> : <EmptyBlock label="Sin metas de reuniones" />}
                {data.porCanal ? (
                  <ChartCard spec={data.porCanal} />
                ) : (
                  <EmptyBlock label="Por canal — falta el campo 'canal' en v_reuniones (Fase posterior)" />
                )}
              </div>
            </section>

            <section>
              <SectionTitle>Vista mensual (las metas cambian por mes)</SectionTitle>
              <div className="mt-3">
                {data.mensual ? <ChartCard spec={data.mensual} /> : <EmptyBlock label="Sin metas mensuales" />}
              </div>
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}
