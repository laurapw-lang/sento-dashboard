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
import { useFilters } from "@/lib/filters";
import { fetchVentaRaw, buildVenta } from "@/lib/venta";
import { fetchVentaGraficasRaw, buildVentaGraficas } from "@/lib/ventaGraficas";
import { useMemo } from "react";

export default function VentaPage() {
  const { open } = useDrilldown();
  const { filters, activeCount } = useFilters();
  const periodoActivo = filters.periodo.preset !== "todo";
  // Nota interpretativa: hoy los deals no tienen fecha de cierre en el CRM, así que el
  // filtro de Periodo (por fecha de cierre) los excluye a todos.
  const ventaVaciaPorFecha = periodoActivo
    ? "Sin deals con fecha de cierre en el periodo. Los deals aún no tienen fecha de cierre capturada en Pipedrive, así que el filtro de Periodo los excluye — quítalo para ver el pipeline."
    : "Sin deals de Operación México en fact_deals todavía";
  const { loading, error, data: rawData } = useAsync(fetchVentaRaw);
  const gRaw = useAsync(fetchVentaGraficasRaw);
  const data = useMemo(
    () => (rawData ? buildVenta(rawData.deals, rawData.metas, rawData.pipe, filters) : null),
    [rawData, filters]
  );
  const g = useMemo(
    () => ({
      loading: gRaw.loading,
      error: gRaw.error,
      data: gRaw.data ? buildVentaGraficas(gRaw.data, filters) : null,
    }),
    [gRaw.loading, gRaw.error, gRaw.data, filters]
  );

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
            <div className="mt-3"><EmptyBlock label={activeCount > 0 ? ventaVaciaPorFecha : "Sin deals del equipo AE todavía"} /></div>
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
        {!loading && !error && data?.isEmpty && <EmptyBlock label={ventaVaciaPorFecha} />}

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
