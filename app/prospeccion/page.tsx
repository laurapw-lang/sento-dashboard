"use client";

// Sección Prospección. Lee las vistas reales (v_prospeccion_funnel, v_prospeccion_canal,
// v_funnel_prospeccion, v_deliverability(+resumen), v_prospeccion_ab).
// fact_prospeccion está vacía hasta que el Flujo 4 corra (Fase 1) → esas gráficas muestran
// "sin datos aún". La parte de reuniones (v_funnel_prospeccion) SÍ trae datos reales.

import { Topbar } from "@/components/Topbar";
import { PageBody, SectionTitle } from "@/components/PageBody";
import { Pill } from "@/components/Badge";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataState";
import { useAsync } from "@/lib/useAsync";
import { useFilters } from "@/lib/filters";
import { fetchProspeccionRaw, buildProspeccion, etapasDe, type Row } from "@/lib/prospeccion";
import { CanalFunnel } from "@/components/prospeccion/CanalFunnel";
import { SegmentoReunion } from "@/components/prospeccion/SegmentoReunion";
import { Entregabilidad } from "@/components/prospeccion/Entregabilidad";
import { useMemo } from "react";

const FASE1 = "Sin datos aún — se poblarán cuando las campañas envíen (Fase 1)";
const n = (v: any) => (v == null ? 0 : Number(v) || 0);

export default function ProspeccionPage() {
  const { loading, error, data: raw } = useAsync(fetchProspeccionRaw);
  const { filters, activeCount } = useFilters();
  const data = useMemo(() => (raw ? buildProspeccion(raw, filters) : null), [raw, filters]);
  const emptyLabel = activeCount > 0 ? "Sin resultados para este filtro" : FASE1;

  return (
    <>
      <Topbar title="Prospección" />
      <PageBody>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="ok">Reuniones: dato real</Pill>
          <Pill tone="warn">Prospección (outbound): Fase 1 — pendiente de envíos</Pill>
          <span className="text-xs text-ink-muted">
            Smartlead/HeyReach se poblarán cuando el warmup termine y las campañas empiecen a enviar.
          </span>
        </div>

        {loading && <LoadingBlock label="Cargando prospección desde Supabase…" />}
        {error && <ErrorBlock message={error} />}

        {!loading && !error && data && (
          <>
            {/* 1 · Funnel por canal */}
            <section>
              <SectionTitle>Funnel por canal</SectionTitle>
              {data.prospEmpty ? (
                <div className="mt-3">
                  <EmptyBlock label={emptyLabel} />
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <CanalFunnel titulo="LinkedIn (HeyReach)" color="#3FA9FF" rows={etapasDe(data.funnelCanal, "LinkedIn")} />
                  <CanalFunnel titulo="Email (Smartlead)" color="#7C5CFF" rows={etapasDe(data.funnelCanal, "Email")} />
                </div>
              )}
            </section>

            {/* 2 · Comparativa de canales */}
            <section>
              <SectionTitle>Comparativa de canales</SectionTitle>
              {data.prospEmpty ? (
                <div className="mt-3">
                  <EmptyBlock label={emptyLabel} />
                </div>
              ) : (
                <ComparativaCanales rows={data.canal} />
              )}
            </section>

            {/* 3 · Prospección → reunión por segmento (reuniones = dato real) */}
            <section>
              <SectionTitle>Prospección → reunión por segmento</SectionTitle>
              <SegmentoReunion rows={data.segmento} />
            </section>

            {/* 4 · Entregabilidad */}
            <section>
              <SectionTitle>Entregabilidad</SectionTitle>
              {data.deliverabilityEmpty ? (
                <div className="mt-3">
                  <EmptyBlock label={emptyLabel} />
                </div>
              ) : (
                <Entregabilidad dominios={data.deliverability} resumen={data.deliverabilityResumen} />
              )}
            </section>

            {/* 5 · A/B de variantes */}
            <section>
              <SectionTitle>A/B de variantes</SectionTitle>
              {data.abTieneDatos ? (
                <AbTabla rows={data.ab} />
              ) : (
                <div className="mt-3">
                  <EmptyBlock label={emptyLabel} />
                </div>
              )}
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}

// ---- Comparativa de canales (tasas clave por canal) ----
function ComparativaCanales({ rows }: { rows: Row[] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-line bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3.5 w-1 rounded-full bg-spectrum-gradient" />
            <h3 className="text-sm font-semibold text-ink">{r.canal}</h3>
            <span className="ml-auto text-[11px] text-ink-muted">{n(r.contactados).toLocaleString("es-MX")} contactados</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Tasa de respuesta" value={n(r.resp_pct)} />
            <Metric label="Tasa de interés" value={n(r.interes_pct)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}%</div>
    </div>
  );
}

// ---- A/B de variantes ----
function AbTabla({ rows }: { rows: Row[] }) {
  const data = [...rows].sort((a, b) => n(b.interes_pct) - n(a.interes_pct));
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-card p-4 shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
            <th className="py-2 pr-3 font-semibold">Canal</th>
            <th className="py-2 px-3 font-semibold">Campaña</th>
            <th className="py-2 px-3 font-semibold">Variante</th>
            <th className="py-2 px-3 text-right font-semibold">Contactados</th>
            <th className="py-2 px-3 text-right font-semibold">Interesados</th>
            <th className="py-2 pl-3 text-right font-semibold">Tasa interés</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0">
              <td className="py-2 pr-3 text-ink">{r.canal}</td>
              <td className="py-2 px-3 text-ink-muted">{r.campana ?? "—"}</td>
              <td className="py-2 px-3 font-medium text-ink">{r.variante ?? "—"}</td>
              <td className="py-2 px-3 text-right tabular-nums text-ink">{n(r.contactados).toLocaleString("es-MX")}</td>
              <td className="py-2 px-3 text-right tabular-nums text-ink">{n(r.interesados).toLocaleString("es-MX")}</td>
              <td className="py-2 pl-3 text-right font-semibold tabular-nums text-ink">{n(r.interes_pct)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
