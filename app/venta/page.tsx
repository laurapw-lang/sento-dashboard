"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Topbar } from "@/components/Topbar";
import { PageBody } from "@/components/PageBody";
import { DataTable } from "@/components/DataTable";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataState";
import { Card, DrillButton, ProgressBar, fmtInt, fmtMoney } from "@/components/ui";
import { useDrilldown } from "@/components/DrillDown";
import { FunnelJourney } from "@/components/venta/FunnelJourney";
import { PipelineActualChart } from "@/components/venta/PipelineActualChart";
import { MotivosChart } from "@/components/venta/MotivosChart";
import { useAsync } from "@/lib/useAsync";
import { useFilters } from "@/lib/filters";
import { fetchVentaRaw, buildVenta, type VentaData } from "@/lib/venta";
import { getSemaforo } from "@/lib/semaforo";

export default function VentaPage() {
  const { loading, error, data: raw } = useAsync(fetchVentaRaw);
  const { filters } = useFilters();
  const data = useMemo(() => (raw ? buildVenta(raw.deals, raw.metas, raw.pipe, filters) : null), [raw, filters]);

  return (
    <>
      <Topbar title="Venta / Pipeline" subtitle="¿Cuánto pipeline tenemos hoy, qué se ganó y dónde se atoran los deals?" />
      <PageBody>
        {loading && <LoadingBlock label="Cargando deals desde Supabase…" />}
        {error && <ErrorBlock message={error} />}
        {!loading && !error && data && (data.isEmpty ? <EmptyBlock label="Sin deals del equipo AE para estos filtros" /> : <Contenido d={data} />)}
      </PageBody>
    </>
  );
}

function Stat({
  label,
  valor,
  sub,
  meta,
  metaLabel,
  onClick,
}: {
  label: string;
  valor: string;
  sub?: React.ReactNode;
  meta?: { value: number; meta: number } | null;
  metaLabel?: string;
  onClick?: () => void;
}) {
  const pct = meta && meta.meta > 0 ? Math.round((meta.value / meta.meta) * 100) : null;
  const sem = pct != null ? getSemaforo(pct) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col rounded-2xl border border-line bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-cardhover disabled:hover:translate-y-0"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      <span className="mt-1.5 text-3xl font-bold tabular-nums text-ink">{valor}</span>
      {sub && <span className="mt-1 text-[12px] text-ink-muted">{sub}</span>}
      {meta && pct != null && (
        <span className="mt-3 block space-y-1.5">
          <ProgressBar value={meta.value} meta={meta.meta} />
          <span className="flex justify-between text-[11px]">
            <span className="text-ink-muted">{metaLabel}</span>
            <span className="font-bold" style={{ color: sem?.color }}>{pct}%</span>
          </span>
        </span>
      )}
    </button>
  );
}

function Contenido({ d }: { d: VentaData }) {
  const { open } = useDrilldown();
  const { filters } = useFilters();
  const y = new Date().getFullYear();

  return (
    <>
      {/* 1 · Números clave */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Pipeline abierto hoy"
          valor={fmtMoney(d.abierto.mrr)}
          sub={<>{d.abierto.deals} deals · ponderado {fmtMoney(d.abierto.ponderado)}</>}
          meta={d.abierto.objetivo ? { value: d.abierto.mrr, meta: d.abierto.objetivo } : null}
          metaLabel={d.abierto.objetivo ? `objetivo ${fmtMoney(d.abierto.objetivo)}` : undefined}
          onClick={() => open(d.abierto.drill)}
        />
        <Stat
          label={`Ganados · ${d.periodo}`}
          valor={fmtInt(d.ganadosPeriodo.deals)}
          sub={<>{fmtMoney(d.ganadosPeriodo.mrr)} de MRR · por fecha en que se ganó</>}
          onClick={() => open(d.ganadosPeriodo.drill)}
        />
        <Stat
          label={`MRR cerrado ${y}`}
          valor={fmtMoney(d.anio.mrr)}
          meta={d.anio.metaMrr ? { value: d.anio.mrr, meta: d.anio.metaMrr } : null}
          metaLabel={d.anio.metaMrr ? `meta anual ${fmtMoney(d.anio.metaMrr)}` : undefined}
          onClick={() => open(d.anio.drill)}
        />
        <Stat
          label={`Logos cerrados ${y}`}
          valor={fmtInt(d.anio.logos)}
          meta={d.anio.metaLogos ? { value: d.anio.logos, meta: d.anio.metaLogos } : null}
          metaLabel={d.anio.metaLogos ? `meta anual ${d.anio.metaLogos}` : undefined}
          onClick={() => open(d.anio.drill)}
        />
      </section>
      <p className="-mt-4 text-[11px] text-ink-muted">
        El pipeline abierto es la foto de hoy (no depende del periodo). MRR y logos se comparan contra la meta anual
        de Operación México. El objetivo de pipeline supone un win rate de 20% y es del equipo completo.
      </p>

      {/* 2 · Por pipeline */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Por pipeline</h2>
          <p className="text-[12px] text-ink-muted">Pipeline abierto hoy en cada pipeline de Pipedrive.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {d.porPipeline.map((p) => (
            <Card
              key={p.nombre}
              className={filters.pipeline !== "Todos" && filters.pipeline !== p.nombre ? "opacity-50" : ""}
              title={
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                  {p.nombre}
                </span>
              }
              action={p.abiertos > 0 ? <DrillButton drill={p.drill} label="Deals" /> : undefined}
            >
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini label="Deals abiertos" value={fmtInt(p.abiertos)} />
                <Mini label="MRR abierto" value={fmtMoney(p.mrr)} strong color={p.color} />
                <Mini label={`Ganados ${y}`} value={fmtInt(p.ganados)} />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 3 · Atención */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">Requieren atención ({d.atencion.rows.length})</h2>
            <p className="text-[12px] text-ink-muted">{d.atencion.subtitle}</p>
          </div>
        </div>
        {d.atencion.rows.length ? (
          <DataTable columns={d.atencion.columns} rows={d.atencion.rows} />
        ) : (
          <EmptyBlock label="Ningún deal estancado 🎉" />
        )}
      </section>

      {/* 4 · Embudo y estado */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Embudo y estado</h2>
          <p className="text-[12px] text-ink-muted">Clic en cualquier barra para ver los deals.</p>
        </div>
        <FunnelJourney stages={d.funnel} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PipelineActualChart rows={d.estado} />
          {d.motivos.length ? <MotivosChart rows={d.motivos} /> : <EmptyBlock label="Sin deals perdidos" />}
        </div>
      </section>

      {/* 5 · Por AE y canal */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Pipeline abierto por AE" subtitle="MRR de los deals abiertos de cada AE.">
          <div className="space-y-3">
            {d.porAe.map((a) => {
              const max = Math.max(1, ...d.porAe.map((x) => x.valor));
              return (
                <button key={a.label} type="button" onClick={() => open(a.drill)} className="block w-full text-left">
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="font-medium text-ink">{a.label}</span>
                    <span className="tabular-nums text-ink-muted">{fmtMoney(a.valor)} · {a.drill.rows.length} deals</span>
                  </div>
                  <ProgressBar value={a.valor} meta={max} color="#29D3D3" />
                </button>
              );
            })}
            {d.porAe.length === 0 && <p className="text-sm text-ink-muted">Sin deals abiertos</p>}
          </div>
        </Card>
        <Card
          title="Canal de entrada"
          subtitle="De dónde vienen los deals y cómo terminan."
          action={<DrillButton drill={d.canalDrill} />}
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.porCanal} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="#EDF1F7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#5E6B82" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="canal" tick={{ fontSize: 11, fill: "#5E6B82" }} axisLine={false} tickLine={false} width={96} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E9F0", borderRadius: 10, fontSize: 12 }} cursor={{ fill: "rgba(63,169,255,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#5E6B82" }} iconType="circle" />
                <Bar dataKey="activo" name="Abiertos" stackId="s" fill="#3FA9FF" barSize={16} />
                <Bar dataKey="ganado" name="Ganados" stackId="s" fill="#1D9E75" barSize={16} />
                <Bar dataKey="perdido" name="Perdidos" stackId="s" fill="#E24B4A" barSize={16} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </>
  );
}

function Mini({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div className="rounded-xl bg-canvas px-2 py-3">
      <div className={`tabular-nums ${strong ? "text-xl font-bold" : "text-xl font-semibold"}`} style={{ color: strong ? color : undefined }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-ink-muted">{label}</div>
    </div>
  );
}
