"use client";

// Piezas visuales reutilizables del rediseño: tarjeta con título, métrica héroe con meta,
// flujo de pasos con conversión, barra de progreso y avisos accionables.

import type { DrillPayload } from "@/lib/types";
import { getSemaforo } from "@/lib/semaforo";
import { useDrilldown } from "./DrillDown";

export const fmtInt = (v: number) => new Intl.NumberFormat("es-MX").format(v);
export const fmtPct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
export const fmtMoney = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-5 shadow-card ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function DrillButton({ drill, label = "Ver detalle" }: { drill: DrillPayload; label?: string }) {
  const { open } = useDrilldown();
  return (
    <button
      type="button"
      onClick={() => open(drill)}
      className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:border-[#3FA9FF] hover:text-[#2478C7]"
    >
      {label} ↗
    </button>
  );
}

export function ProgressBar({ value, meta, color }: { value: number; meta: number; color?: string }) {
  const pct = meta > 0 ? Math.round((value / meta) * 100) : 0;
  const sem = getSemaforo(pct);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line/70">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color ?? sem.color }}
      />
    </div>
  );
}

/** Métrica principal grande: valor, meta, % y una frase que dice qué significa. */
export function HeroStat({
  eyebrow,
  value,
  meta,
  explicacion,
  drill,
  extra,
}: {
  eyebrow: string;
  value: number;
  meta: number | null;
  explicacion: React.ReactNode;
  drill?: DrillPayload;
  extra?: React.ReactNode;
}) {
  const { open } = useDrilldown();
  const pct = meta ? Math.round((value / meta) * 100) : null;
  const sem = pct != null ? getSemaforo(pct) : null;
  const faltan = meta ? Math.max(0, meta - value) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card p-6 shadow-card">
      <span className="absolute inset-x-0 top-0 h-1 bg-spectrum-gradient" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{eyebrow}</div>
          <button
            type="button"
            disabled={!drill}
            onClick={() => drill && open(drill)}
            className={`mt-2 flex items-baseline gap-2 text-left ${drill ? "cursor-pointer hover:opacity-80" : ""}`}
          >
            <span className="text-5xl font-bold tabular-nums tracking-tight text-ink">{fmtInt(value)}</span>
            {meta != null && <span className="text-xl font-medium text-ink-muted">de {fmtInt(meta)}</span>}
          </button>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-muted">{explicacion}</p>
        </div>

        {sem && pct != null && (
          <div className="flex flex-col items-end gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold"
              style={{ color: sem.color, backgroundColor: sem.soft }}
            >
              {sem.icon} {pct}% de la meta
            </span>
            <span className="text-[12px] text-ink-muted">
              {faltan ? <>faltan <strong className="text-ink">{faltan}</strong> para la meta</> : "¡meta cumplida!"}
            </span>
          </div>
        )}
      </div>

      {meta != null && (
        <div className="mt-5">
          <ProgressBar value={value} meta={meta} />
        </div>
      )}
      {extra && <div className="mt-4">{extra}</div>}
    </div>
  );
}

/** Flujo de pasos con conversión entre ellos (ej. Agendadas → Realizadas → Calificadas). */
export function Flow({
  steps,
}: {
  steps: { label: string; value: number; hint: string; drill?: DrillPayload; color: string; conv?: { label: string; value: number | null } }[];
}) {
  const { open } = useDrilldown();
  return (
    <div className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
      {steps.map((s, i) => (
        <div key={s.label} className="contents">
          {i > 0 && (
            <div className="flex items-center justify-center md:flex-col">
              <span className="text-lg text-slate-300 md:rotate-0">→</span>
              {s.conv && (
                <span className="ml-2 whitespace-nowrap rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-muted md:ml-0 md:mt-1">
                  {s.conv.label} {fmtPct(s.conv.value)}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={!s.drill}
            onClick={() => s.drill && open(s.drill)}
            className="group rounded-xl border border-line bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-cardhover disabled:hover:translate-y-0"
            style={{ borderTop: `3px solid ${s.color}` }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{s.label}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-ink">{fmtInt(s.value)}</div>
            <div className="mt-1 text-[12px] leading-snug text-ink-muted">{s.hint}</div>
          </button>
        </div>
      ))}
    </div>
  );
}

export function Callout({
  tone = "warn",
  title,
  children,
  action,
}: {
  tone?: "warn" | "info" | "ok";
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const map = {
    warn: "border-semaforo-amber/40 bg-semaforo-amber/10",
    info: "border-spectrum-blue/30 bg-spectrum-blue/10",
    ok: "border-semaforo-green/30 bg-semaforo-green/10",
  } as const;
  const icon = { warn: "⚠", info: "ℹ", ok: "✓" }[tone];
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 ${map[tone]}`}>
      <div className="flex min-w-0 gap-2.5">
        <span className="mt-0.5 text-sm">{icon}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">{title}</div>
          {children && <div className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{children}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
