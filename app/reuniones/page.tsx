"use client";

import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Topbar } from "@/components/Topbar";
import { PageBody } from "@/components/PageBody";
import { DataTable } from "@/components/DataTable";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataState";
import { Card, Callout, DrillButton } from "@/components/ui";
import { AgendaStrip, BulletRows, DonutPick, FunnelViz, RadialGauge } from "@/components/viz";
import { useDrilldown } from "@/components/DrillDown";
import { useAsync } from "@/lib/useAsync";
import { useFilters } from "@/lib/filters";
import { fetchReunionesRaw, buildReuniones, type ReunionesData } from "@/lib/reuniones";
import { PIPELINES, VERT_COLORS } from "@/lib/pipeline";
import { getSemaforo } from "@/lib/semaforo";

export default function ReunionesPage() {
  const { loading, error, data: raw } = useAsync(fetchReunionesRaw);
  const { filters } = useFilters();
  const data = useMemo(() => (raw ? buildReuniones(raw.reuniones, raw.metas, filters) : null), [raw, filters]);

  return (
    <>
      <Topbar title="Reuniones" subtitle="Generación de reuniones (setters): cuántas calificadas llevamos, quién va bien y qué viene." />
      <PageBody>
        {loading && <LoadingBlock label="Cargando reuniones desde Supabase…" />}
        {error && <ErrorBlock message={error} />}
        {!loading && !error && data && <Contenido d={data} />}
      </PageBody>
    </>
  );
}

function Contenido({ d }: { d: ReunionesData }) {
  const { open } = useDrilldown();
  const { filters, set, setPeriodo } = useFilters();
  const [vistaAgenda, setVistaAgenda] = useState<"calendario" | "lista">("calendario");
  const toggle = (key: "pipeline" | "vertical" | "origen", v: string, todos: string) =>
    set({ [key]: filters[key] === v ? todos : v } as any);
  const faltan = d.calif.meta != null ? Math.max(0, d.calif.meta - d.calif.valor) : null;
  const esperado = d.ritmo != null && d.calif.meta != null ? Math.round(d.calif.meta * d.ritmo) : null;

  return (
    <>
      {/* ───────── 1 · Meta + embudo ───────── */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.25fr]">
        <Card title={`Calificadas realizadas · ${d.periodo}`} subtitle="La métrica de comisiones: la reunión ocurrió y califica (graban llamadas y con volumen).">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <RadialGauge value={d.calif.valor} meta={d.calif.meta} ritmo={d.ritmo} size={190} onClick={() => open(d.calif.drill)} />
            <div className="w-full space-y-3">
              <Dato
                titulo={faltan == null ? "Sin meta comparable" : faltan === 0 ? "¡Meta cumplida!" : `Faltan ${faltan}`}
                texto={
                  d.calif.meta == null
                    ? d.metaAplica
                      ? "Esta persona no tiene meta cargada."
                      : "Las metas son totales: no se comparan al ver un solo pipeline."
                    : `${d.metaAmbito} = ${d.calif.meta}`
                }
                tono={faltan === 0 ? "ok" : "neutral"}
              />
              {esperado != null && (
                <Dato
                  titulo={d.calif.valor >= esperado ? `En ritmo (+${d.calif.valor - esperado})` : `${esperado - d.calif.valor} abajo del ritmo`}
                  texto={`Al día ${new Date().getDate()}, el ritmo de la meta pide ~${esperado}. La rayita negra del anillo marca ese punto.`}
                  tono={d.calif.valor >= esperado ? "ok" : "bad"}
                />
              )}
              <Dato
                titulo={`${d.tasaCalif == null ? "—" : Math.round(d.tasaCalif * 100) + "%"} de las realizadas califican`}
                texto="Si baja, revisa el filtro de calificación antes de agendar (¿graban llamadas? ¿volumen?)."
                tono="neutral"
              />
            </div>
          </div>
        </Card>

        <Card title="Del agendado a la calificada" subtitle="Clic en cada barra para ver las cuentas.">
          <FunnelViz
            convLabels={["asisten", "califican"]}
            steps={[
              { label: "Agendadas", value: d.agendadas.valor, color: "#3FA9FF", drill: d.agendadas.drill, hint: "Por fecha en que se agendó" },
              { label: "Realizadas", value: d.realizadas.valor, color: "#29B6C9", drill: d.realizadas.drill, hint: "Por fecha de la reunión" },
              { label: "Calificadas", value: d.calif.valor, color: "#1D9E75", drill: d.calif.drill, hint: "Lo que se paga" },
            ]}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => open(d.calif.drill)} className="rounded-xl bg-semaforo-green/10 px-3 py-2 text-left hover:ring-1 hover:ring-semaforo-green">
              <div className="text-xl font-bold tabular-nums text-[#158060]">{d.calif.valor}</div>
              <div className="text-[11px] text-ink-muted">realizadas que <strong>sí califican</strong> (se pagan)</div>
            </button>
            <button type="button" onClick={() => open(d.noCalif.drill)} className="rounded-xl bg-slate-100 px-3 py-2 text-left hover:ring-1 hover:ring-slate-300">
              <div className="text-xl font-bold tabular-nums text-ink">{d.noCalif.valor}</div>
              <div className="text-[11px] text-ink-muted">realizadas que <strong>no califican</strong> (se miden aparte)</div>
            </button>
          </div>
          <p className="mt-3 text-[11px] text-ink-muted">
            Agendadas cuentan por fecha de agendado y realizadas por fecha de reunión: la conversión es del periodo, no de las mismas cuentas.
            {d.calif.metaAgendadas ? ` Meta de agendadas: ${d.calif.metaAgendadas}.` : ""}
          </p>
        </Card>
      </section>

      {d.sinActualizar.rows.length > 0 && (
        <Callout
          tone="warn"
          title={`${d.sinActualizar.rows.length} reunión(es) ya pasaron pero siguen en “Demo Agendada” en Pipedrive`}
          action={<DrillButton drill={d.sinActualizar} label="Ver cuáles" />}
        >
          Las contamos como realizadas por su fecha. Muévelas a Demo Realizada (o márcalas perdidas si no ocurrieron) y
          captura “Graban llamadas” para que puedan calificar.
        </Callout>
      )}

      {/* ───────── Realizadas que NO califican (aparte) ───────── */}
      <Card
        title={`Realizadas que no califican · ${d.noCalif.valor}`}
        subtitle="Reuniones que sí se hicieron pero no cuentan para comisión. Se miden aparte para no perderlas de vista: las marcadas como “recuperable” pueden contar si se captura el dato en Pipedrive."
        action={d.noCalif.valor > 0 ? <DrillButton drill={d.noCalif.drill} label="Ver todas" /> : undefined}
      >
        {d.noCalif.valor === 0 ? (
          <p className="text-sm text-ink-muted">Todas las reuniones realizadas del periodo califican 🎉</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
            <div className="flex flex-col justify-center rounded-xl bg-canvas p-4 text-center">
              <div className="text-4xl font-bold tabular-nums text-ink">{d.noCalif.valor}</div>
              <div className="text-[12px] text-ink-muted">
                de {d.realizadas.valor} realizadas ({d.realizadas.valor ? Math.round((d.noCalif.valor / d.realizadas.valor) * 100) : 0}%)
              </div>
              {d.noCalif.razones.some((r) => r.recuperable) && (
                <div className="mt-2 rounded-lg bg-semaforo-amber/15 px-2 py-1 text-[11px] font-semibold text-[#B9770F]">
                  {d.noCalif.razones.filter((r) => r.recuperable).reduce((s, r) => s + r.n, 0)} recuperables
                </div>
              )}
            </div>
            <div className="space-y-2.5">
              {d.noCalif.razones.map((r) => (
                <button key={r.razon} type="button" onClick={() => open(r.drill)} className="block w-full text-left">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex items-center gap-2 text-ink">
                      {r.razon}
                      {r.recuperable && (
                        <span className="rounded-full bg-semaforo-amber/15 px-2 py-0.5 text-[10px] font-bold text-[#B9770F]">recuperable</span>
                      )}
                    </span>
                    <span className="font-bold tabular-nums text-ink">{r.n}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-line/60">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(r.n / d.noCalif.valor) * 100}%`, background: r.recuperable ? "#EF9F27" : "#94A3B8" }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ───────── 2 · Equipo + mezclas ───────── */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Equipo vs meta" subtitle="Barra = calificadas · rayita = meta. Clic en el nombre para filtrar todo por esa persona.">
          <BulletRows
            rows={d.equipo.map((p) => ({
              label: p.nombre,
              value: p.calif,
              meta: p.meta,
              secundario: `${p.realizadas} real. · ${p.noCalif} no calif. · ${p.agendadas} ag.`,
              drill: p.drill,
              activo: filters.origen === p.nombre,
              onPick: () => toggle("origen", p.nombre, "Todos"),
            }))}
          />
        </Card>

        <Card title="Por pipeline" subtitle="Calificadas realizadas. Clic en un segmento para ver solo ese pipeline.">
          <DonutPick
            centerLabel="calificadas"
            selected={filters.pipeline}
            onPick={(n) => toggle("pipeline", n, "Todos")}
            data={d.porPipeline.map((p) => ({ name: p.nombre, value: p.calif, color: p.color }))}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] text-ink-muted">
            {d.porPipeline.map((p) => (
              <button key={p.nombre} type="button" onClick={() => open(p.drill)} className="rounded-lg bg-canvas px-2 py-1.5 hover:text-[#2478C7]">
                <strong className="text-ink">{p.realizadas}</strong> realizadas · <strong className="text-ink">{p.agendadas}</strong> agendadas
                <span className="block font-semibold" style={{ color: p.color }}>{p.nombre} ↗</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Por vertical" subtitle="Calificadas realizadas. Clic para filtrar por vertical.">
          <DonutPick
            centerLabel="calificadas"
            selected={filters.vertical}
            onPick={(n) => toggle("vertical", n, "Todas")}
            data={d.porVertical.map((v) => ({ name: v.nombre, value: v.calif, color: VERT_COLORS[v.nombre] ?? "#C6CEDA" }))}
          />
        </Card>
      </section>

      {/* ───────── 3 · Agenda ───────── */}
      <Card
        title={`Próximas reuniones (${d.agenda.length})`}
        subtitle="Las próximas 2 semanas. Antes de cada reunión, confirma que tenga “Graban llamadas” capturado."
        action={
          <div className="flex rounded-lg border border-line p-0.5 text-[11px] font-semibold">
            {(["calendario", "lista"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVistaAgenda(v)}
                className={`rounded-md px-2.5 py-1 capitalize ${vistaAgenda === v ? "bg-ink text-white" : "text-ink-muted hover:text-ink"}`}
              >
                {v}
              </button>
            ))}
          </div>
        }
      >
        {d.agenda.length === 0 ? (
          <EmptyBlock label="No hay reuniones con fecha futura en Pipedrive" />
        ) : vistaAgenda === "calendario" ? (
          <AgendaStrip items={d.agenda} />
        ) : (
          <DataTable columns={d.proximas.columns} rows={d.proximas.rows} />
        )}
      </Card>

      {/* ───────── 4 · Tendencia ───────── */}
      <Card title="Últimos 6 meses" subtitle="Calificadas realizadas por mes y pipeline vs meta; en gris, las realizadas que no califican. Clic en un mes para ver ese mes en todo el dashboard.">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={d.tendencia}
              margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
              onClick={(e: any) => {
                const row = e?.activePayload?.[0]?.payload;
                if (!row?.key) return;
                const [y, m] = String(row.key).split("-").map(Number);
                const last = new Date(y, m, 0).getDate();
                setPeriodo({ preset: "personalizado", from: `${row.key}-01`, to: `${row.key}-${String(last).padStart(2, "0")}` });
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid stroke="#EDF1F7" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#5E6B82" }} axisLine={{ stroke: "#EDF1F7" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#5E6B82" }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E9F0", borderRadius: 10, fontSize: 12 }} cursor={{ fill: "rgba(63,169,255,0.08)" }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#5E6B82", paddingTop: 6 }} iconType="circle" />
              {PIPELINES.map((p, i) => (
                <Bar key={p.nombre} dataKey={p.nombre} stackId="c" fill={p.color} maxBarSize={52} radius={i === PIPELINES.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
              ))}
              <Bar dataKey="No califican" stackId="n" fill="#CBD5E1" maxBarSize={22} radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="meta" name="Meta" stroke="#1A2130" strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {d.tendencia.map((m) => {
            const tot = m.Analytics + m["Voice Agent"];
            const sem = m.meta ? getSemaforo(Math.round((tot / m.meta) * 100)) : null;
            return (
              <div key={m.key} className="rounded-lg bg-canvas px-2 py-1.5 text-center">
                <div className="text-[10px] font-semibold uppercase text-ink-muted">{m.mes}</div>
                <div className="text-sm font-bold tabular-nums text-ink">
                  {tot}
                  {m.meta ? <span className="font-normal text-ink-muted">/{m.meta}</span> : null}
                </div>
                {sem && m.meta ? <div className="text-[10px] font-bold" style={{ color: sem.color }}>{Math.round((tot / m.meta) * 100)}%</div> : null}
                {m["No califican"] > 0 && <div className="text-[10px] text-ink-muted">+{m["No califican"]} no calif.</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {d.isEmpty && (
        <Callout tone="info" title="Sin reuniones en este periodo con estos filtros">
          Cambia el periodo (ej. “Mes pasado”) o quita filtros.
        </Callout>
      )}
    </>
  );
}

function Dato({ titulo, texto, tono }: { titulo: string; texto: string; tono: "ok" | "bad" | "neutral" }) {
  const color = tono === "ok" ? "#158060" : tono === "bad" ? "#C23B3A" : "#1A2130";
  return (
    <div className="rounded-xl bg-canvas px-3 py-2.5">
      <div className="text-[15px] font-bold" style={{ color }}>{titulo}</div>
      <div className="text-[12px] leading-snug text-ink-muted">{texto}</div>
    </div>
  );
}
