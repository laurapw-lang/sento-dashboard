"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Topbar } from "@/components/Topbar";
import { PageBody } from "@/components/PageBody";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataState";
import { Card, DrillButton, fmtInt, fmtMoney } from "@/components/ui";
import { DonutPick, RadialGauge, StageBoard } from "@/components/viz";
import { useDrilldown } from "@/components/DrillDown";
import { FunnelJourney } from "@/components/venta/FunnelJourney";
import { useAsync } from "@/lib/useAsync";
import { useFilters } from "@/lib/filters";
import { fetchVentaRaw, buildVenta, STAGE_ORDER, type VentaData } from "@/lib/venta";
import { PIPELINES, VERT_COLORS } from "@/lib/pipeline";

// Moneda compacta para el centro de los medidores ($37.2k).
const kMoney = (v: number) => (v >= 1000 ? `$${(v / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k` : `$${Math.round(v)}`);

const STAGE_COLORS = ["#C6D9F5", "#A9CBF7", "#7FB5F7", "#3FA9FF", "#29B6C9", "#29D3D3", "#2BD98C", "#1D9E75"];

export default function VentaPage() {
  const { loading, error, data: raw } = useAsync(fetchVentaRaw);
  const { filters } = useFilters();
  const data = useMemo(() => (raw ? buildVenta(raw.deals, raw.metas, raw.pipe, filters) : null), [raw, filters]);

  return (
    <>
      <Topbar title="Venta / Pipeline" subtitle="Cierre (AEs): cuánto pipeline hay, dónde está cada deal y qué tan cerca vamos de la meta del año." />
      <PageBody>
        {loading && <LoadingBlock label="Cargando deals desde Supabase…" />}
        {error && <ErrorBlock message={error} />}
        {!loading && !error && data && (data.isEmpty ? <EmptyBlock label="Sin deals del equipo AE para estos filtros" /> : <Contenido d={data} />)}
      </PageBody>
    </>
  );
}

function Contenido({ d }: { d: VentaData }) {
  const { open } = useDrilldown();
  const { filters, set } = useFilters();
  const y = new Date().getFullYear();
  const avanceAnio = (() => {
    const now = new Date();
    const ini = new Date(y, 0, 1).getTime();
    return (now.getTime() - ini) / (new Date(y + 1, 0, 1).getTime() - ini);
  })();
  const toggle = (key: "pipeline" | "vertical" | "ae", v: string, todos: string) => set({ [key]: filters[key] === v ? todos : v } as any);

  return (
    <>
      {/* ───────── 1 · Marcador ───────── */}
      <Card title="Marcador del año" subtitle={`Contra la meta anual de Operación México. La rayita negra marca dónde deberíamos ir hoy (${Math.round(avanceAnio * 100)}% del año).`}>
        <div className="grid grid-cols-2 items-start gap-6 lg:grid-cols-4">
          <Medidor titulo={`MRR cerrado ${y}`}>
            <RadialGauge value={d.anio.mrr} meta={d.anio.metaMrr} ritmo={avanceAnio} size={150} format={kMoney} onClick={() => open(d.anio.drill)} />
          </Medidor>
          <Medidor titulo={`Logos cerrados ${y}`}>
            <RadialGauge value={d.anio.logos} meta={d.anio.metaLogos} ritmo={avanceAnio} size={150} onClick={() => open(d.anio.drill)} />
          </Medidor>
          <Medidor titulo="Pipeline abierto vs objetivo" nota="Objetivo = meta anual ÷ win rate 20%">
            <RadialGauge value={d.abierto.mrr} meta={d.abierto.objetivo} size={150} format={kMoney} onClick={() => open(d.abierto.drill)} />
          </Medidor>
          <div className="flex h-full flex-col justify-center gap-3">
            <button type="button" onClick={() => open(d.abierto.drill)} className="rounded-xl bg-canvas px-4 py-3 text-left hover:ring-1 hover:ring-[#3FA9FF]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Deals abiertos hoy</div>
              <div className="text-3xl font-bold tabular-nums text-ink">{fmtInt(d.abierto.deals)}</div>
              <div className="text-[12px] text-ink-muted">ponderado {fmtMoney(d.abierto.ponderado)}</div>
            </button>
            <button type="button" onClick={() => open(d.ganadosPeriodo.drill)} className="rounded-xl bg-semaforo-green/10 px-4 py-3 text-left hover:ring-1 hover:ring-semaforo-green">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#158060]">Ganados · {d.periodo}</div>
              <div className="text-3xl font-bold tabular-nums text-ink">{fmtInt(d.ganadosPeriodo.deals)}</div>
              <div className="text-[12px] text-ink-muted">{fmtMoney(d.ganadosPeriodo.mrr)} de MRR</div>
            </button>
          </div>
        </div>
      </Card>

      {/* ───────── 2 · Tablero ───────── */}
      <Card
        title="Tablero del pipeline (hoy)"
        subtitle="Cada tarjeta es un deal abierto. Borde de color = pipeline · borde rojo = atorado (≥14 días en la etapa o ≥10 sin actividad). Clic = abrir en Pipedrive."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {PIPELINES.map((p) => (
              <span key={p.nombre} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: p.color }}>
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} /> {p.nombre}
              </span>
            ))}
            {d.atencion.rows.length > 0 && <DrillButton drill={d.atencion} label={`${d.atencion.rows.length} atorados`} />}
          </div>
        }
      >
        <StageBoard etapas={STAGE_ORDER} cards={d.board} />
      </Card>

      {/* ───────── 3 · Embudo + pérdidas ───────── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FunnelJourney stages={d.funnel} />
        {d.motivos.length ? (
          <Card title="Por qué perdemos" subtitle={`${d.motivos.reduce((s, m) => s + m.deals, 0)} deals perdidos del equipo. Clic para ver cuáles.`}>
            <div className="space-y-2">
              {d.motivos.map((m) => {
                const max = Math.max(...d.motivos.map((x) => x.deals));
                return (
                  <button key={m.motivo} type="button" onClick={() => open(m.drill)} className="block w-full text-left">
                    <div className="mb-1 flex justify-between gap-2 text-[12px]">
                      <span className="truncate text-ink">{m.motivo}</span>
                      <span className="font-bold tabular-nums text-ink">{m.deals}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-line/60">
                      <div className="h-full rounded-full bg-[#E24B4A]/80 transition-all hover:bg-[#E24B4A]" style={{ width: `${(m.deals / max) * 100}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        ) : (
          <EmptyBlock label="Sin deals perdidos" />
        )}
      </section>

      {/* ───────── 4 · Quién y dónde ───────── */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Deals abiertos por AE" subtitle="Apilado por etapa. Clic en una barra para filtrar por ese AE.">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={d.aeEtapa}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 4 }}
                onClick={(e: any) => e?.activeLabel && toggle("ae", e.activeLabel, "Todos")}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid stroke="#EDF1F7" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#5E6B82" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="ae" width={110} tick={{ fontSize: 11, fill: "#1A2130" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E9F0", borderRadius: 10, fontSize: 12 }} cursor={{ fill: "rgba(63,169,255,0.08)" }} />
                {STAGE_ORDER.map((e, i) => (
                  <Bar key={e} dataKey={e} stackId="s" fill={STAGE_COLORS[i]} barSize={22} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">Más oscuro = etapa más avanzada.</p>
        </Card>

        <Card title="Pipeline abierto por pipeline" subtitle="MRR abierto. Clic para ver solo ese pipeline.">
          <DonutPick
            centerLabel="deals abiertos"
            selected={filters.pipeline}
            onPick={(n) => toggle("pipeline", n, "Todos")}
            data={d.porPipeline.map((p) => ({ name: p.nombre, value: p.abiertos, color: p.color }))}
          />
          <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[11px] text-ink-muted">
            {d.porPipeline.map((p) => (
              <button key={p.nombre} type="button" onClick={() => open(p.drill)} className="rounded-lg bg-canvas px-2 py-1.5 hover:text-[#2478C7]">
                <strong className="text-ink">{fmtMoney(p.mrr)}</strong> MRR · {p.ganados} ganados {y}
                <span className="block font-semibold" style={{ color: p.color }}>{p.nombre} ↗</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Pipeline abierto por vertical" subtitle="Deals abiertos. Clic para filtrar por vertical.">
          <DonutPick
            centerLabel="deals abiertos"
            selected={filters.vertical}
            onPick={(n) => toggle("vertical", n, "Todas")}
            data={d.porVertical.map((v) => ({ name: v.nombre, value: v.deals, color: VERT_COLORS[v.nombre] ?? "#C6CEDA" }))}
          />
        </Card>
      </section>

      {/* ───────── 5 · Canal ───────── */}
      <Card title="Canal de entrada" subtitle="De dónde vienen los deals y cómo terminan." action={<DrillButton drill={d.canalDrill} />}>
        <div className="h-56 w-full">
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
    </>
  );
}

function Medidor({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{titulo}</span>
      {children}
      {nota && <span className="text-[10px] text-ink-muted">{nota}</span>}
    </div>
  );
}
