"use client";

// Componentes VISUALES e INTERACTIVOS del Command Center:
//   RadialGauge  — anillo de avance vs meta, con marca de "ritmo esperado".
//   FunnelViz    — embudo de barras centradas con % de conversión entre pasos.
//   DonutPick    — dona clickeable: al hacer clic en un segmento aplica un filtro global.
//   BulletRows   — barras por persona: real vs meta (marca vertical = meta).
//   AgendaStrip  — próximas 2 semanas en formato calendario (chips por reunión).
//   StageBoard   — tablero tipo kanban del pipeline abierto (tarjeta por deal).

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DrillPayload } from "@/lib/types";
import { getSemaforo } from "@/lib/semaforo";
import { pipelineMeta } from "@/lib/pipeline";
import { pipedriveDealUrl } from "@/lib/pipedrive";
import { useDrilldown } from "./DrillDown";

const fmtInt = (v: number) => new Intl.NumberFormat("es-MX").format(v);
const fmtMoneyShort = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k` : `$${fmtInt(Math.round(v))}`;

// ---------------------------------------------------------------- RadialGauge
export function RadialGauge({
  value,
  meta,
  size = 168,
  label,
  sub,
  ritmo,
  format = fmtInt,
  onClick,
}: {
  value: number;
  meta: number | null;
  size?: number;
  label?: string;
  sub?: string;
  ritmo?: number | null; // 0..1 posición del "debería ir aquí hoy"
  format?: (v: number) => string;
  onClick?: () => void;
}) {
  const stroke = Math.round(size * 0.085);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = meta ? value / meta : 0;
  const sem = meta ? getSemaforo(Math.round(pct * 100)) : null;
  const color = sem?.color ?? "#3FA9FF";
  const dash = Math.min(1, pct) * c;
  const ang = ritmo != null ? ritmo * 2 * Math.PI - Math.PI / 2 : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group relative shrink-0 rounded-full transition-transform enabled:hover:scale-[1.02]"
      style={{ width: size, height: size }}
      title={onClick ? "Ver detalle" : undefined}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDF1F7" strokeWidth={stroke} />
        {dash > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 900ms ease" }}
        />}
      </svg>
      {ang != null && (
        <span
          className="absolute h-3 w-1 rounded-full bg-ink"
          title="Ritmo esperado a hoy"
          style={{
            left: size / 2 + r * Math.cos(ang) - 2,
            top: size / 2 + r * Math.sin(ang) - 6,
            transform: `rotate(${(ang * 180) / Math.PI + 90}deg)`,
          }}
        />
      )}
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-bold tabular-nums leading-none text-ink" style={{ fontSize: size * 0.21 }}>
          {format(value)}
        </span>
        {meta != null && <span className="mt-1 text-[11px] text-ink-muted">de {format(meta)}</span>}
        {sem && (
          <span className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: sem.color, background: sem.soft }}>
            {Math.round(pct * 100)}%
          </span>
        )}
        {label && <span className="mt-1 max-w-[80%] text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</span>}
        {sub && <span className="text-[10px] text-ink-muted">{sub}</span>}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------- FunnelViz
export type FunnelStep = { label: string; value: number; color: string; hint?: string; drill?: DrillPayload };

export function FunnelViz({ steps, convLabels }: { steps: FunnelStep[]; convLabels?: string[] }) {
  const { open } = useDrilldown();
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-1">
      {steps.map((s, i) => {
        const w = Math.max(14, (s.value / max) * 100);
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev ? s.value / prev : null;
        return (
          <div key={s.label}>
            {i > 0 && (
              <div className="flex items-center justify-center gap-1.5 py-0.5 text-[11px] text-ink-muted">
                <span>↓</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    conv == null ? "bg-canvas" : conv < 0.5 ? "bg-semaforo-red/10 text-[#C23B3A]" : "bg-canvas"
                  }`}
                >
                  {convLabels?.[i - 1] ?? "pasan"} {conv == null ? "—" : `${Math.round(conv * 100)}%`}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => s.drill && open(s.drill)}
              disabled={!s.drill}
              className="group mx-auto flex h-14 items-center justify-between rounded-xl px-4 text-white shadow-sm transition-all enabled:hover:brightness-110"
              style={{ width: `${w}%`, background: s.color, minWidth: 170 }}
              title={s.hint}
            >
              <span className="truncate text-[12px] font-semibold uppercase tracking-wide opacity-95">{s.label}</span>
              <span className="text-2xl font-bold tabular-nums">{fmtInt(s.value)}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- DonutPick
export type Slice = { name: string; value: number; color: string };

export function DonutPick({
  data,
  selected,
  onPick,
  centerLabel,
  format = fmtInt,
  height = 190,
}: {
  data: Slice[];
  selected?: string; // valor activo del filtro ("Todos" = ninguno)
  onPick?: (name: string) => void; // clic = filtrar (clic de nuevo = quitar)
  centerLabel: string;
  format?: (v: number) => string;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = data.filter((d) => d.value > 0);
  const hayFiltro = selected && data.some((d) => d.name === selected);
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="relative w-full max-w-[200px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(v: number, n: string) => [`${format(v)} (${total ? Math.round((v / total) * 100) : 0}%)`, n]}
              contentStyle={{ background: "#fff", border: "1px solid #E5E9F0", borderRadius: 10, fontSize: 12 }}
            />
            <Pie
              data={shown.length ? shown : [{ name: "Sin datos", value: 1, color: "#EDF1F7" }]}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={shown.length > 1 ? 2 : 0}
              stroke="#fff"
              strokeWidth={2}
              cursor={onPick ? "pointer" : undefined}
              onClick={(d: { name?: string }) => onPick && d?.name && shown.length && onPick(d.name)}
              isAnimationActive
            >
              {(shown.length ? shown : [{ color: "#EDF1F7", name: "x" }]).map((d, i) => (
                <Cell key={i} fill={d.color} opacity={hayFiltro && d.name !== selected ? 0.25 : 1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-ink">{format(total)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-1">
        {data.map((d) => {
          const on = selected === d.name;
          return (
            <li key={d.name}>
              <button
                type="button"
                disabled={!onPick}
                onClick={() => onPick?.(d.name)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
                  on ? "bg-ink text-white" : "enabled:hover:bg-canvas"
                } ${hayFiltro && !on ? "opacity-50" : ""}`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="font-semibold tabular-nums">{format(d.value)}</span>
                <span className={`w-10 text-right text-[11px] tabular-nums ${on ? "text-white/70" : "text-ink-muted"}`}>
                  {total ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- BulletRows
export type BulletRow = { label: string; value: number; meta: number | null; secundario?: string; drill?: DrillPayload; onPick?: () => void; activo?: boolean };

export function BulletRows({ rows, format = fmtInt }: { rows: BulletRow[]; format?: (v: number) => string }) {
  const { open } = useDrilldown();
  const max = Math.max(1, ...rows.map((r) => Math.max(r.value, r.meta ?? 0)));
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = r.meta ? Math.round((r.value / r.meta) * 100) : null;
        const sem = pct != null ? getSemaforo(pct) : null;
        return (
          <div key={r.label} className={`rounded-xl p-2 transition-colors ${r.activo ? "bg-ink/5 ring-1 ring-ink/20" : "hover:bg-canvas"}`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
              <button type="button" onClick={r.onPick} disabled={!r.onPick} className="truncate font-semibold text-ink enabled:hover:underline" title={r.onPick ? "Filtrar por esta persona" : undefined}>
                {r.label}
              </button>
              <button type="button" onClick={() => r.drill && open(r.drill)} disabled={!r.drill} className="shrink-0 tabular-nums text-ink-muted enabled:hover:text-[#2478C7]">
                <strong className="text-base text-ink">{format(r.value)}</strong>
                {r.meta != null && <> / {format(r.meta)}</>}
                {pct != null && (
                  <span className="ml-1.5 font-bold" style={{ color: sem?.color }}>
                    {pct}%
                  </span>
                )}
                {r.secundario && <span className="ml-2 text-[11px]">{r.secundario}</span>}
              </button>
            </div>
            <div className="relative h-3 w-full rounded-full bg-line/70">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(r.value / max) * 100}%`, background: sem?.color ?? "#3FA9FF" }}
              />
              {r.meta != null && (
                <span className="absolute -top-1 h-5 w-0.5 rounded bg-ink" style={{ left: `calc(${(r.meta / max) * 100}% - 1px)` }} title={`Meta ${r.meta}`} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- AgendaStrip
export type AgendaItem = { fecha: string; cuenta: string | null; deal_id: string; pipeline: string; graba: string; setter: string; ae: string | null };

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function AgendaStrip({ items, dias = 14 }: { items: AgendaItem[]; dias?: number }) {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const days = Array.from({ length: dias }, (_, i) => new Date(hoy.getTime() + i * 86400000)).filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
  const fuera = items.filter((x) => x.fecha > iso(days[days.length - 1]));
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {days.map((d, i) => {
          const key = iso(d);
          const delDia = items.filter((x) => x.fecha === key);
          const esHoy = i === 0;
          return (
            <div key={key} className={`min-h-[96px] rounded-xl border p-2 ${esHoy ? "border-[#3FA9FF] bg-[#3FA9FF]/5" : "border-line bg-card"}`}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className={`text-[11px] font-semibold uppercase ${esHoy ? "text-[#2478C7]" : "text-ink-muted"}`}>
                  {esHoy ? "Hoy" : DIAS[d.getDay()]}
                </span>
                <span className="text-[11px] tabular-nums text-ink-muted">{d.getDate()}/{d.getMonth() + 1}</span>
              </div>
              <div className="space-y-1">
                {delDia.map((x) => {
                  const p = pipelineMeta(x.pipeline);
                  const falta = x.graba === "pendiente";
                  return (
                    <a
                      key={x.deal_id}
                      href={pipedriveDealUrl(x.deal_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${x.cuenta} · ${x.pipeline} · agendó ${x.setter} · AE ${x.ae ?? "—"} · graba llamadas: ${x.graba}`}
                      className="block truncate rounded-md px-1.5 py-1 text-[11px] font-semibold transition-all hover:brightness-95"
                      style={{ background: p.soft, color: p.color, borderLeft: `3px solid ${p.color}` }}
                    >
                      {falta && <span className="mr-0.5 text-[#B9770F]">●</span>}
                      {x.cuenta}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
        <span><span className="text-[#B9770F]">●</span> falta “Graban llamadas”</span>
        <span>Clic en una reunión = abrir en Pipedrive</span>
        {fuera.length > 0 && <span>+{fuera.length} más adelante</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- StageBoard
export type BoardCard = {
  deal_id: string;
  cuenta: string | null;
  etapa: string;
  pipeline: string;
  mrr: number;
  ae: string;
  sinActividad: number;
  enEtapa: number;
  siguiente: string | null;
};

export function StageBoard({ etapas, cards }: { etapas: string[]; cards: BoardCard[] }) {
  const cols = etapas.map((e) => ({ etapa: e, items: cards.filter((c) => c.etapa === e) })).filter((c) => c.items.length);
  if (!cols.length) return <p className="py-6 text-center text-sm text-ink-muted">Sin deals abiertos para estos filtros</p>;
  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3 px-1">
        {cols.map((col) => {
          const mrr = col.items.reduce((s, c) => s + c.mrr, 0);
          return (
            <div key={col.etapa} className="w-60 shrink-0 rounded-2xl bg-canvas p-2.5">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="text-[12px] font-bold text-ink">{col.etapa}</span>
                <span className="text-[11px] tabular-nums text-ink-muted">
                  {col.items.length} · {fmtMoneyShort(mrr)}
                </span>
              </div>
              <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-0.5">
                {[...col.items]
                  .sort((a, b) => b.sinActividad - a.sinActividad)
                  .map((c) => {
                    const p = pipelineMeta(c.pipeline);
                    const atorado = c.enEtapa >= 14 || c.sinActividad >= 10;
                    return (
                      <a
                        key={c.deal_id}
                        href={pipedriveDealUrl(c.deal_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-xl border bg-card p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-cardhover ${
                          atorado ? "border-semaforo-red/40" : "border-line"
                        }`}
                        style={{ borderLeft: `4px solid ${p.color}` }}
                        title={c.siguiente ? `Siguiente paso: ${c.siguiente}` : "Sin siguiente paso"}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink">{c.cuenta}</span>
                          {c.mrr > 0 && <span className="shrink-0 text-[11px] font-bold tabular-nums text-ink">{fmtMoneyShort(c.mrr)}</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="rounded bg-canvas px-1.5 py-0.5 font-semibold text-ink-muted">{c.ae.split(" ")[0]}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-semibold ${
                              c.sinActividad >= 10 ? "bg-semaforo-red/10 text-[#C23B3A]" : "bg-canvas text-ink-muted"
                            }`}
                            title="Días sin actividad"
                          >
                            {c.sinActividad}d sin act.
                          </span>
                          {!c.siguiente && <span className="rounded bg-semaforo-amber/15 px-1.5 py-0.5 font-semibold text-[#B9770F]">sin paso</span>}
                        </div>
                      </a>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
