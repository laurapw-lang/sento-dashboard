"use client";

// Barra superior: título + qué responde la página + frescura del dato, y debajo la barra de
// filtros GLOBALES (afectan las 3 secciones). Lo más usado (Periodo y Pipeline) va como botones
// de un clic; el resto de segmentaciones van en selectores compactos.

import { usePathname } from "next/navigation";
import { useFilters, periodoLabel, type Periodo } from "@/lib/filters";
import { ORIGEN_OPTIONS } from "@/lib/team";
import { PIPELINES } from "@/lib/pipeline";
import { useAsync } from "@/lib/useAsync";
import { fetchUltimaSync } from "@/lib/db";

const PERIODO_OPTS: { value: Periodo["preset"]; label: string }[] = [
  { value: "este_mes", label: "Este mes" },
  { value: "mes_pasado", label: "Mes pasado" },
  { value: "este_trimestre", label: "Trimestre" },
  { value: "este_anio", label: "Año" },
  { value: "todo", label: "Todo" },
  { value: "personalizado", label: "Fechas…" },
];

const SIMPLE: { key: "vertical" | "ae" | "carril" | "origen" | "canal"; label: string; options: string[] }[] = [
  { key: "origen", label: "Quién agendó", options: ORIGEN_OPTIONS }, // setter — Reuniones/Venta
  { key: "ae", label: "AE", options: ["Todos", "Andrés Sanjuán", "Edgardo Velasquez", "Michelle Sosa"] },
  { key: "vertical", label: "Vertical", options: ["Todas", "Banca/Fintech", "Retail", "Salud", "Seguros", "BPO", "Sin definir"] },
  { key: "carril", label: "Carril", options: ["Todos", "Mid-market", "Enterprise"] },
  { key: "canal", label: "Canal", options: ["Todos", "LinkedIn", "Email"] }, // Prospección
];

/** "hace 35 min" / "hace 3 h" / "hace 2 días" + si está atrasado (Flujo 5 corre cada 2 h, 7–21 h MX). */
function frescura(iso: string | null | undefined): { texto: string; atrasado: boolean } | null {
  if (!iso) return null;
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  const texto = min < 60 ? `hace ${min} min` : min < 60 * 24 ? `hace ${Math.round(min / 60)} h` : `hace ${Math.round(min / 1440)} días`;
  // Atrasado = más de 14 h sin sync (cubre la pausa nocturna 21→7 h).
  return { texto, atrasado: min > 14 * 60 };
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-line bg-card p-0.5 shadow-card">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              on ? "bg-ink text-white shadow-sm" : "text-ink-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Selector({ label, value, options, onChange, active }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; active: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors focus-within:border-[#3FA9FF] ${
        active ? "border-[#3FA9FF] bg-[#3FA9FF]/10" : "border-line bg-card"
      }`}
    >
      <span className="text-ink-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer bg-transparent text-xs font-semibold text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { filters, set, setPeriodo, reset, activeCount } = useFilters();
  const pathname = usePathname();
  const sync = useAsync(fetchUltimaSync);
  const fresh = frescura(sync.data);
  const p = filters.periodo;
  const enProspeccion = pathname === "/prospeccion";
  const sinFiltros = pathname === "/insights"; // Insights se calcula siempre sobre el mes en curso
  // Por sección: en Prospección no aplican personas (AE / Quién agendó) ni Pipeline (no hay
  // deals); Canal solo aplica en Prospección. Los que no aplican se ocultan para no confundir.
  const aplica = (key: string) => (enProspeccion ? key !== "ae" && key !== "origen" : key !== "canal");

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto max-w-[1400px] space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
          </div>
          {fresh && (
            <span
              title="Última sincronización Pipedrive → Supabase (Flujo 5 corre cada 2 h, 7–21 h MX)"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                fresh.atrasado
                  ? "border-semaforo-amber/40 bg-semaforo-amber/15 text-[#B9770F]"
                  : "border-semaforo-green/30 bg-semaforo-green/10 text-[#158060]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${fresh.atrasado ? "bg-semaforo-amber" : "animate-pulse bg-semaforo-green"}`} />
              Pipedrive sincronizado {fresh.texto}
              {fresh.atrasado && " · revisar Flujo 5"}
            </span>
          )}
        </div>

        {!sinFiltros && (
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={p.preset} options={PERIODO_OPTS} onChange={(v) => setPeriodo({ preset: v })} />
          {p.preset === "personalizado" && (
            <div className="flex items-center gap-1 rounded-lg border border-[#3FA9FF] bg-[#3FA9FF]/10 px-2 py-1 text-xs">
              <input type="date" value={p.from ?? ""} onChange={(e) => setPeriodo({ from: e.target.value || null })}
                className="bg-transparent text-xs font-semibold text-ink outline-none" />
              <span className="text-ink-muted">→</span>
              <input type="date" value={p.to ?? ""} onChange={(e) => setPeriodo({ to: e.target.value || null })}
                className="bg-transparent text-xs font-semibold text-ink outline-none" />
            </div>
          )}

          {!enProspeccion && (
            <Segmented
              value={filters.pipeline}
              onChange={(v) => set({ pipeline: v })}
              options={[
                { value: "Todos", label: "Ambos pipelines" },
                ...PIPELINES.map((pl) => ({
                  value: pl.nombre as string,
                  label: (
                    <>
                      <span className="h-2 w-2 rounded-full" style={{ background: pl.color }} />
                      {pl.nombre}
                    </>
                  ),
                })),
              ]}
            />
          )}

          {SIMPLE.filter((f) => aplica(f.key)).map((f) => (
            <Selector
              key={f.key}
              label={f.label}
              value={filters[f.key]}
              options={f.options}
              onChange={(v) => set({ [f.key]: v } as any)}
              active={filters[f.key] !== f.options[0]}
            />
          ))}

          {activeCount > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1 rounded-full border border-semaforo-amber/30 bg-semaforo-amber/15 px-2.5 py-1 text-[11px] font-semibold text-[#B9770F] transition-colors hover:bg-semaforo-amber/20"
            >
              ✕ Quitar filtros ({activeCount})
            </button>
          )}
        </div>

        )}

        {!sinFiltros && (
        <p className="text-[12px] text-ink-muted">
          Viendo <strong className="text-ink">{periodoLabel(p)}</strong>
          {!enProspeccion && (
            <>
              {" · "}
              <strong className="text-ink">
                {filters.pipeline === "Todos" ? "Analytics + Voice Agent" : `solo ${filters.pipeline}`}
              </strong>
            </>
          )}
        </p>
        )}
      </div>
    </header>
  );
}
