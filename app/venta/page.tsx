"use client";

import { Topbar } from "@/components/Topbar";
import { PageBody, SectionTitle } from "@/components/PageBody";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { DataTable } from "@/components/DataTable";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataState";
import { useDrilldown } from "@/components/DrillDown";
import { FunnelJourney } from "@/components/venta/FunnelJourney";
import { PipelineActualChart } from "@/components/venta/PipelineActualChart";
import { MotivosChart } from "@/components/venta/MotivosChart";
import { useAsync } from "@/lib/useAsync";
import { loadVentaData } from "@/lib/venta";
import { loadVentaGraficas } from "@/lib/ventaGraficas";

export default function VentaPage() {
  const { open } = useDrilldown();
  const { loading, error, data } = useAsync(loadVentaData);
  const g = useAsync(loadVentaGraficas);

  return (
    <>
      <Topbar title="Venta / Pipeline" />
      <PageBody>
        {/* Sección principal: recorrido del journey + estado actual + motivos */}
        <section>
          <SectionTitle>Recorrido y estado del pipeline</SectionTitle>
          {g.loading && <div className="mt-3"><LoadingBlock label="Cargando embudo desde Supabase…" /></div>}
          {g.error && <div className="mt-3"><ErrorBlock message={g.error} /></div>}
          {!g.loading && !g.error && g.data && (g.data.isEmpty ? (
            <div className="mt-3"><EmptyBlock label="Sin deals del equipo AE todavía" /></div>
          ) : (
            <div className="mt-3 space-y-4">
              <FunnelJourney stages={g.data.funnel} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <PipelineActualChart rows={g.data.pipeline} />
                {g.data.motivos.length ? (
                  <MotivosChart rows={g.data.motivos} />
                ) : (
                  <EmptyBlock label="Sin deals perdidos" />
                )}
              </div>
            </div>
          ))}
        </section>

        {loading && <LoadingBlock label="Cargando indicadores…" />}
        {error && <ErrorBlock message={error} />}
        {!loading && !error && data?.isEmpty && (
          <EmptyBlock label="Sin deals de Operación México en fact_deals todavía" />
        )}

        {!loading && !error && data && !data.isEmpty && (
          <>
            <section>
              <SectionTitle>Indicadores clave</SectionTitle>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.kpis.map((k) => (
                  <KpiCard key={k.id} kpi={k} />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Pipeline (agregados)</SectionTitle>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {data.charts.map((c) => (
                  <ChartCard key={c.id} spec={c} />
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>Deals que requieren atención</SectionTitle>
                  <button onClick={() => open(data.dealsAtencion)} className="text-xs text-ink-muted transition-colors hover:text-[#2478C7]">
                    ver todo ↗
                  </button>
                </div>
                {data.dealsAtencion.rows.length ? (
                  <DataTable columns={data.dealsAtencion.columns} rows={data.dealsAtencion.rows} />
                ) : (
                  <EmptyBlock label="Ningún deal estancado 🎉" />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>Razones de pérdida</SectionTitle>
                  <button onClick={() => open(data.razonesPerdida)} className="text-xs text-ink-muted transition-colors hover:text-[#2478C7]">
                    ver todo ↗
                  </button>
                </div>
                {data.razonesPerdida.rows.length ? (
                  <DataTable columns={data.razonesPerdida.columns} rows={data.razonesPerdida.rows} />
                ) : (
                  <EmptyBlock label="Sin deals perdidos registrados" />
                )}
              </div>
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}
