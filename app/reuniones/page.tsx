"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Topbar } from "@/components/Topbar";
import { PageBody } from "@/components/PageBody";
import { DataTable } from "@/components/DataTable";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/DataState";
import { Card, Callout, DrillButton, Flow, HeroStat, ProgressBar, fmtPct } from "@/components/ui";
import { useDrilldown } from "@/components/DrillDown";
import { useAsync } from "@/lib/useAsync";
import { useFilters } from "@/lib/filters";
import { fetchReunionesRaw, buildReuniones, type ReunionesData } from "@/lib/reuniones";
import { PIPELINES } from "@/lib/pipeline";
import { getSemaforo } from "@/lib/semaforo";

export default function ReunionesPage() {
  const { loading, error, data: raw } = useAsync(fetchReunionesRaw);
  const { filters } = useFilters();
  const data = useMemo(() => (raw ? buildReuniones(raw.reuniones, raw.metas, filters) : null), [raw, filters]);

  return (
    <>
      <Topbar
        title="Reuniones"
        subtitle="¿Cuántas reuniones calificadas hicimos, cuánto falta para la meta y qué hay que atender?"
      />
      <PageBody>
        {loading && <LoadingBlock label="Cargando reuniones desde Supabase…" />}
        {error && <ErrorBlock message={error} />}
        {!loading && !error && data && <Contenido d={data} />}
      </PageBody>
    </>
  );
}

function Contenido({ d }: { d: ReunionesData }) {
  const { filters } = useFilters();
  return (
    <>
      {/* 1 · La métrica que se paga */}
      <HeroStat
        eyebrow={`Calificadas realizadas · ${d.periodo}`}
        value={d.calif.valor}
        meta={d.calif.meta}
        drill={d.calif.drill}
        explicacion={
          <>
            Reuniones que <strong className="text-ink">sí ocurrieron</strong> en el periodo y{" "}
            <strong className="text-ink">califican</strong> (graban llamadas y con volumen). Es la métrica de comisiones.
            {d.calif.meta != null && <> Meta: {d.metaAmbito}.</>}
            {!d.metaAplica && <> La meta no se compara al ver un solo pipeline (las metas son totales).</>}
          </>
        }
        extra={filters.periodo.preset === "este_mes" && d.calif.meta != null ? <Ritmo valor={d.calif.valor} meta={d.calif.meta} /> : undefined}
      />

      {/* Avisos accionables */}
      {d.porRevisar.rows.length > 0 && (
        <Callout
          tone="warn"
          title={`${d.porRevisar.rows.length} reunión(es) realizada(s) no se pueden evaluar: falta un dato en Pipedrive`}
          action={<DrillButton drill={d.porRevisar} label="Ver cuáles" />}
        >
          Mientras falte el dato no cuentan como calificadas. Captúralo en Pipedrive y se actualizan en la siguiente
          sincronización (cada hora).
        </Callout>
      )}

      {/* 2 · Del agendado a la calificada */}
      <section className="space-y-3">
        <Encabezado titulo="Del agendado a la calificada" detalle="Clic en cualquier número para ver las cuentas." />
        <Flow
          steps={[
            {
              label: "Agendadas",
              value: d.agendadas.valor,
              hint: d.calif.metaAgendadas
                ? `Meta de agendadas: ${d.calif.metaAgendadas}. Cuenta por fecha en que se agendó.`
                : "Cuenta por la fecha en que se agendó (creación del deal).",
              drill: d.agendadas.drill,
              color: "#3FA9FF",
            },
            {
              label: "Realizadas",
              value: d.realizadas.valor,
              hint: "La reunión ocurrió (llegó a Demo Realizada o más). Cuenta por fecha de reunión.",
              drill: d.realizadas.drill,
              color: "#29D3D3",
              conv: { label: "asistencia", value: d.showRate },
            },
            {
              label: "Calificadas",
              value: d.calif.valor,
              hint: "Realizadas que cumplen la regla. Esta es la que se paga.",
              drill: d.calif.drill,
              color: "#1D9E75",
              conv: { label: "califican", value: d.tasaCalif },
            },
          ]}
        />
        <p className="text-[11px] text-ink-muted">
          Ojo: agendadas y realizadas usan fechas distintas, así que la asistencia es una referencia del periodo, no
          de las mismas cuentas.
        </p>
      </section>

      {/* 3 · Por pipeline */}
      <section className="space-y-3">
        <Encabezado
          titulo="Por pipeline"
          detalle="Analytics y Voice Agent son pipelines separados en Pipedrive. Usa el selector de arriba para ver solo uno."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {d.porPipeline.map((p) => {
            const atenuado = filters.pipeline !== "Todos" && filters.pipeline !== p.nombre;
            return (
              <Card
                key={p.nombre}
                className={atenuado ? "opacity-50" : ""}
                title={
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                    {p.nombre}
                  </span>
                }
                action={p.realizadas > 0 ? <DrillButton drill={p.drill} label="Cuentas" /> : undefined}
              >
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Agendadas" value={p.agendadas} />
                  <MiniStat label="Realizadas" value={p.realizadas} />
                  <MiniStat label="Calificadas" value={p.calif} strong color={p.color} />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4 · Equipo */}
      <section className="space-y-3">
        <Encabezado titulo="Equipo — avance contra la meta" detalle="Quién agendó (setter). Clic en una persona para ver sus calificadas." />
        <Equipo d={d} />
      </section>

      {/* 5 · Próximas */}
      <section className="space-y-3">
        <Encabezado
          titulo={`Próximas reuniones (${d.proximas.rows.length})`}
          detalle="Desde hoy, la más cercana primero. Revisa que tengan “Graban llamadas” capturado antes de la reunión."
        />
        {d.proximas.rows.length ? (
          <DataTable columns={d.proximas.columns} rows={d.proximas.rows} />
        ) : (
          <EmptyBlock label="No hay reuniones con fecha futura en Pipedrive" />
        )}
      </section>

      {/* 6 · Tendencia */}
      <section className="space-y-3">
        <Encabezado titulo="Últimos 6 meses" detalle="Calificadas realizadas por mes, separadas por pipeline, contra la meta." />
        <Card>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.tendencia} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#EDF1F7" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#5E6B82" }} axisLine={{ stroke: "#EDF1F7" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5E6B82" }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #E5E9F0", borderRadius: 10, fontSize: 12 }}
                  cursor={{ fill: "rgba(63,169,255,0.06)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#5E6B82", paddingTop: 6 }} iconType="circle" />
                {PIPELINES.map((p, i) => (
                  <Bar
                    key={p.nombre}
                    dataKey={p.nombre}
                    stackId="c"
                    fill={p.color}
                    maxBarSize={48}
                    radius={i === PIPELINES.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#1A2130" strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {d.isEmpty && (
        <Callout tone="info" title="Sin reuniones en este periodo con estos filtros">
          Cambia el periodo (ej. “Mes pasado”) o quita filtros.
        </Callout>
      )}
    </>
  );
}

/** Ritmo del mes en curso: lo esperado a hoy si se avanzara parejo hacia la meta. */
function Ritmo({ valor, meta }: { valor: number; meta: number }) {
  const hoy = new Date();
  const dias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const esperado = Math.round((meta * hoy.getDate()) / dias);
  const diff = valor - esperado;
  return (
    <p className="text-[12px] text-ink-muted">
      Día <strong className="text-ink">{hoy.getDate()}</strong> de {dias}. Al ritmo de la meta, hoy deberían ir ~
      <strong className="text-ink">{esperado}</strong> →{" "}
      {diff >= 0 ? (
        <strong className="text-[#158060]">en ritmo (+{diff})</strong>
      ) : (
        <strong className="text-[#C23B3A]">{-diff} por debajo del ritmo</strong>
      )}
      .
    </p>
  );
}

function Encabezado({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-ink">{titulo}</h2>
      {detalle && <p className="text-[12px] text-ink-muted">{detalle}</p>}
    </div>
  );
}

function MiniStat({ label, value, strong, color }: { label: string; value: number; strong?: boolean; color?: string }) {
  return (
    <div className="rounded-xl bg-canvas px-2 py-3">
      <div className={`tabular-nums ${strong ? "text-3xl font-bold" : "text-2xl font-semibold"}`} style={{ color: strong ? color : undefined }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-ink-muted">{label}</div>
    </div>
  );
}

function Equipo({ d }: { d: ReunionesData }) {
  const { open } = useDrilldown();
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      <div className="hidden grid-cols-[1.4fr_0.7fr_0.7fr_2fr] gap-4 border-b border-line bg-canvas px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted md:grid">
        <span>Persona</span>
        <span className="text-right">Agendadas</span>
        <span className="text-right">Realizadas</span>
        <span>Calificadas vs meta</span>
      </div>
      {d.equipo.map((p) => {
        const pct = p.meta ? Math.round((p.calif / p.meta) * 100) : null;
        const sem = pct != null ? getSemaforo(pct) : null;
        return (
          <button
            key={p.nombre}
            type="button"
            onClick={() => open(p.drill)}
            className="grid w-full grid-cols-2 gap-x-4 gap-y-2 border-b border-line/60 px-5 py-3.5 text-left transition-colors last:border-0 hover:bg-canvas md:grid-cols-[1.4fr_0.7fr_0.7fr_2fr] md:items-center"
          >
            <span className="col-span-2 font-semibold text-ink md:col-span-1">{p.nombre}</span>
            <span className="text-sm tabular-nums text-ink-muted md:text-right">
              <span className="md:hidden">Agendadas: </span>
              {p.agendadas}
            </span>
            <span className="text-sm tabular-nums text-ink-muted md:text-right">
              <span className="md:hidden">Realizadas: </span>
              {p.realizadas}
            </span>
            <span className="col-span-2 flex items-center gap-3 md:col-span-1">
              <span className="w-16 shrink-0 text-sm tabular-nums">
                <strong className="text-lg text-ink">{p.calif}</strong>
                {p.meta != null && <span className="text-ink-muted"> / {p.meta}</span>}
              </span>
              {p.meta != null ? (
                <>
                  <span className="flex-1">
                    <ProgressBar value={p.calif} meta={p.meta} />
                  </span>
                  <span className="w-12 text-right text-[12px] font-bold tabular-nums" style={{ color: sem?.color }}>
                    {pct}%
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-ink-muted">sin meta {d.metaAplica ? "definida" : "(filtro de pipeline)"}</span>
              )}
            </span>
          </button>
        );
      })}
      {d.equipo.length === 0 && <div className="px-5 py-6 text-center text-sm text-ink-muted">Sin personas para este filtro</div>}
      <div className="border-t border-line bg-canvas px-5 py-2 text-[11px] text-ink-muted">
        Calificación: {fmtPct(d.tasaCalif)} de las realizadas del periodo califican.
      </div>
    </div>
  );
}
