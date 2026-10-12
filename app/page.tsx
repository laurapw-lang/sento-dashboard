"use client";

// COMMAND CENTER — portada con las DOS gestiones lado a lado:
//   · Generación de reuniones (setters)  → /reuniones
//   · Cierre / pipeline (AEs)             → /venta
// y el puente entre ambas: qué pasó con las reuniones realizadas (¿avanzaron? ¿se ganaron?).

import Link from "next/link";
import { useMemo } from "react";
import { Topbar } from "@/components/Topbar";
import { PageBody } from "@/components/PageBody";
import { LoadingBlock, ErrorBlock } from "@/components/DataState";
import { Card, DrillButton, fmtInt, fmtMoney } from "@/components/ui";
import { BulletRows, RadialGauge } from "@/components/viz";
import { useDrilldown } from "@/components/DrillDown";
import { useAsync } from "@/lib/useAsync";
import { useFilters } from "@/lib/filters";
import { fetchDeals, fetchMetas, fetchPipelineObjetivo, fetchReuniones } from "@/lib/db";
import { buildReuniones } from "@/lib/reuniones";
import { buildVenta, dealsDrill, STAGE_ORDER } from "@/lib/venta";
import { buildInsights } from "@/lib/insights";
import { pipelineMeta } from "@/lib/pipeline";
import { pipedriveDealUrl } from "@/lib/pipedrive";
import type { DrillPayload } from "@/lib/types";

async function fetchTodo() {
  const [reuniones, deals, metas, pipe] = await Promise.all([fetchReuniones(), fetchDeals(), fetchMetas(), fetchPipelineObjetivo()]);
  return { reuniones, deals, metas, pipe };
}

const kMoney = (v: number) => (v >= 1000 ? `$${(v / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k` : `$${Math.round(v)}`);
const STAGE_COLORS = ["#C6D9F5", "#A9CBF7", "#7FB5F7", "#3FA9FF", "#29B6C9", "#29D3D3", "#2BD98C", "#1D9E75"];
const RANK: Record<string, number> = Object.fromEntries(STAGE_ORDER.map((e, i) => [e, i + 1]));

export default function CommandCenter() {
  const { loading, error, data: raw } = useAsync(fetchTodo);
  const { filters } = useFilters();
  const v = useMemo(() => {
    if (!raw) return null;
    const r = buildReuniones(raw.reuniones, raw.metas, filters);
    const ve = buildVenta(raw.deals, raw.metas, raw.pipe, filters);
    const ins = buildInsights(raw).filter((i) => i.sev !== "ok").slice(0, 5);

    // Puente: reuniones REALIZADAS en los últimos 90 días (respeta pipeline/persona/vertical, no el
    // Periodo: de reunión a venta pasan semanas) → ¿en qué quedó cada deal hoy?
    const hoy = new Date();
    const desde = new Date(hoy.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    const r90 = buildReuniones(raw.reuniones, raw.metas, {
      ...filters,
      periodo: { preset: "personalizado", from: desde, to: hoy.toISOString().slice(0, 10) },
    });
    const dealById = new Map(raw.deals.map((d) => [d.deal_id, d]));
    const realizadas = r90.realizadas.drill.rows.map((x) => dealById.get(String(x.deal_id))).filter(Boolean) as typeof raw.deals;
    const avanzaron = realizadas.filter((d) => d.etapa === "Ganado" || (RANK[d.etapa ?? ""] ?? 0) >= 5);
    const ganadas = realizadas.filter((d) => d.etapa === "Ganado");
    const perdidas = realizadas.filter((d) => d.etapa === "Perdido");
    const enCurso = realizadas.filter((d) => d.etapa !== "Perdido" && d.etapa !== "Ganado");
    return { r, ve, ins, puente: { realizadas, avanzaron, ganadas, perdidas, enCurso } };
  }, [raw, filters]);

  return (
    <>
      <Topbar title="Command Center" subtitle="Las dos gestiones en una vista: generación de reuniones (setters) y cierre (AEs). Clic en cualquier cosa para profundizar." />
      <PageBody>
        {loading && <LoadingBlock label="Cargando el Command Center…" />}
        {error && <ErrorBlock message={error} />}
        {v && <Vista {...v} />}
      </PageBody>
    </>
  );
}

function Vista({ r, ve, ins, puente }: VistaProps) {
  const { open } = useDrilldown();
  const y = new Date().getFullYear();
  const avanceAnio = (Date.now() - new Date(y, 0, 1).getTime()) / (new Date(y + 1, 0, 1).getTime() - new Date(y, 0, 1).getTime());
  const totalAbiertos = Math.max(1, ve.board.length);
  const porEtapa = STAGE_ORDER.map((e, i) => ({ e, n: ve.board.filter((c) => c.etapa === e).length, color: STAGE_COLORS[i] })).filter((x) => x.n);

  return (
    <>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ───────── Generación ───────── */}
        <Card
          title={<Titulo emoji="◎" texto="Generación de reuniones" color="#3FA9FF" />}
          subtitle={`Setters · ${r.periodo}`}
          action={<Link href="/reuniones" className="text-[12px] font-semibold text-[#2478C7] hover:underline">Ver Reuniones →</Link>}
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-1">
              <RadialGauge value={r.calif.valor} meta={r.calif.meta} ritmo={r.ritmo} size={170} onClick={() => open(r.calif.drill)} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Calificadas realizadas</span>
            </div>
            <div className="w-full space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini label="Agendadas" value={r.agendadas.valor} drill={r.agendadas.drill} color="#3FA9FF" />
                <Mini label="Realizadas" value={r.realizadas.valor} drill={r.realizadas.drill} color="#29B6C9" />
                <Mini label="No califican" value={r.noCalif.valor} drill={r.noCalif.drill} color="#94A3B8" />
                <Mini label="Próximas" value={r.agenda.length} drill={r.proximas} color="#7C5CFF" />
              </div>
              <BulletRows
                rows={r.equipo
                  .filter((p) => p.meta != null || p.calif > 0)
                  .map((p) => ({ label: p.nombre, value: p.calif, meta: p.meta, drill: p.drill }))}
              />
            </div>
          </div>
          {r.agenda.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Siguientes reuniones</div>
              <div className="flex flex-wrap gap-1.5">
                {r.agenda.slice(0, 6).map((a) => {
                  const p = pipelineMeta(a.pipeline);
                  return (
                    <a
                      key={a.deal_id}
                      href={pipedriveDealUrl(a.deal_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-2 py-1 text-[12px] font-semibold hover:brightness-95"
                      style={{ background: p.soft, color: p.color }}
                      title={`${a.pipeline} · agendó ${a.setter} · graba llamadas: ${a.graba}`}
                    >
                      <span className="mr-1 font-normal text-ink-muted">{a.fecha.slice(5).split("-").reverse().join("/")}</span>
                      {a.cuenta}
                      {a.graba === "pendiente" && <span className="ml-1 text-[#B9770F]">●</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* ───────── Cierre ───────── */}
        <Card
          title={<Titulo emoji="▤" texto="Cierre y pipeline" color="#1D9E75" />}
          subtitle={`AEs · pipeline de hoy · meta anual ${y}`}
          action={<Link href="/venta" className="text-[12px] font-semibold text-[#2478C7] hover:underline">Ver Venta →</Link>}
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-1">
              <RadialGauge value={ve.anio.mrr} meta={ve.anio.metaMrr} ritmo={avanceAnio} size={170} format={kMoney} onClick={() => open(ve.anio.drill)} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">MRR cerrado {y}</span>
            </div>
            <div className="w-full space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Mini label="Deals abiertos" value={ve.abierto.deals} drill={ve.abierto.drill} color="#3FA9FF" />
                <Mini label={`Ganados (${r.periodo.split(" ")[0]})`} value={ve.ganadosPeriodo.deals} drill={ve.ganadosPeriodo.drill} color="#1D9E75" />
                <Mini label="Atorados" value={ve.atencion.rows.length} drill={ve.atencion} color="#E24B4A" />
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <div className="mb-1.5 flex justify-between text-[11px] text-ink-muted">
                  <span className="font-semibold uppercase tracking-wider">Pipeline abierto por etapa</span>
                  <span className="tabular-nums">{fmtMoney(ve.abierto.mrr)}</span>
                </div>
                <div className="flex h-7 w-full overflow-hidden rounded-lg">
                  {porEtapa.map((x) => (
                    <button
                      key={x.e}
                      type="button"
                      onClick={() => open({ ...ve.abierto.drill, title: `Deals en “${x.e}”`, subtitle: `${x.n} deal(s)`, rows: ve.abierto.drill.rows.filter((row) => row.etapa === x.e) })}
                      className="flex items-center justify-center text-[11px] font-bold text-ink transition-all hover:brightness-90"
                      style={{ width: `${(x.n / totalAbiertos) * 100}%`, background: x.color }}
                      title={`${x.e}: ${x.n} deals`}
                    >
                      {x.n}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-ink-muted">
                  {porEtapa.map((x) => (
                    <span key={x.e} className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm" style={{ background: x.color }} />
                      {x.e}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ve.porPipeline.map((p) => (
                  <button key={p.nombre} type="button" onClick={() => open(p.drill)} className="rounded-xl px-3 py-2 text-left hover:brightness-95" style={{ background: pipelineMeta(p.nombre).soft }}>
                    <div className="text-[11px] font-bold" style={{ color: p.color }}>{p.nombre}</div>
                    <div className="text-sm font-semibold text-ink">
                      {p.abiertos} abiertos · {kMoney(p.mrr)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ───────── Puente entre gestiones ───────── */}
      <Card
        title="De la reunión a la venta"
        subtitle={`Las ${puente.realizadas.length} reuniones realizadas en los últimos 90 días: ¿en qué quedó cada deal hoy? Aquí se conectan las dos gestiones.`}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Paso n={puente.realizadas.length} label="Reuniones realizadas" color="#29B6C9" drill={dealsDrill("Reuniones realizadas — estado hoy", puente.realizadas)} />
          <Paso n={puente.avanzaron.length} label="Avanzaron a Caso de Negocio o más" color="#3FA9FF" base={puente.realizadas.length} drill={dealsDrill("Avanzaron a Caso de Negocio o más", puente.avanzaron)} />
          <Paso n={puente.ganadas.length} label="Ya ganadas" color="#1D9E75" base={puente.realizadas.length} drill={dealsDrill("Ganadas", puente.ganadas)} />
          <Paso n={puente.perdidas.length} label="Perdidas" color="#E24B4A" base={puente.realizadas.length} drill={dealsDrill("Perdidas", puente.perdidas)} />
        </div>
        {puente.realizadas.length > 0 && (
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-line/60">
            <span style={{ width: `${(puente.ganadas.length / puente.realizadas.length) * 100}%`, background: "#1D9E75" }} />
            <span style={{ width: `${((puente.enCurso.length) / puente.realizadas.length) * 100}%`, background: "#3FA9FF" }} />
            <span style={{ width: `${(puente.perdidas.length / puente.realizadas.length) * 100}%`, background: "#E24B4A" }} />
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink-muted">Verde = ganadas · azul = siguen abiertas · rojo = perdidas.</p>
      </Card>

      {/* ───────── Qué atender ───────── */}
      <Card title="Qué atender hoy" subtitle="Alertas calculadas con los datos del mes en curso." action={<Link href="/insights" className="text-[12px] font-semibold text-[#2478C7] hover:underline">Ver todas →</Link>}>
        {ins.length === 0 ? (
          <p className="text-sm text-ink-muted">Todo en orden 🎉</p>
        ) : (
          <ul className="divide-y divide-line">
            {ins.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className={`mt-0.5 text-sm ${i.sev === "warn" ? "text-[#B9770F]" : "text-[#2478C7]"}`}>{i.sev === "warn" ? "⚠" : "ℹ"}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-ink">{i.titulo}</div>
                    <div className="text-[12px] text-ink-muted">{i.texto}</div>
                  </div>
                </div>
                {i.drill && <DrillButton drill={i.drill} label="Ver" />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

type DealRows = Awaited<ReturnType<typeof fetchDeals>>;
type VistaProps = {
  r: ReturnType<typeof buildReuniones>;
  ve: ReturnType<typeof buildVenta>;
  ins: ReturnType<typeof buildInsights>;
  puente: Record<"realizadas" | "avanzaron" | "ganadas" | "perdidas" | "enCurso", DealRows>;
};

function Titulo({ emoji, texto, color }: { emoji: string; texto: string; color: string }) {
  return (
    <span className="flex items-center gap-2 text-base">
      <span className="grid h-7 w-7 place-items-center rounded-lg text-sm text-white" style={{ background: color }}>{emoji}</span>
      {texto}
    </span>
  );
}

function Mini({ label, value, drill, color }: { label: string; value: number; drill: DrillPayload; color: string }) {
  const { open } = useDrilldown();
  return (
    <button type="button" onClick={() => open(drill)} className="rounded-xl bg-canvas px-2 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-2xl font-bold tabular-nums text-ink">{fmtInt(value)}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
    </button>
  );
}

function Paso({ n, label, color, base, drill }: { n: number; label: string; color: string; base?: number; drill: DrillPayload }) {
  const { open } = useDrilldown();
  return (
    <button type="button" onClick={() => open(drill)} className="rounded-xl border border-line bg-card px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-cardhover" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-ink">{n}</span>
        {base ? <span className="text-sm font-semibold" style={{ color }}>{Math.round((n / base) * 100)}%</span> : null}
      </div>
      <div className="text-[12px] text-ink-muted">{label}</div>
    </button>
  );
}
