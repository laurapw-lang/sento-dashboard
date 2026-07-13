"use client";

// Barra de filtros GLOBALES. Escriben al estado global (useFilters) y afectan las 3
// secciones. Periodo tiene presets + modo personalizado (rango de fechas).
// Nota de build incremental: en esta primera parte SOLO Periodo filtra la data;
// Vertical/AE/Carril/Origen se cablean en las siguientes partes.

import { useFilters, periodoLabel, type Periodo } from "@/lib/filters";

const PERIODO_OPTS: { value: Periodo["preset"]; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "este_mes", label: "Este mes" },
  { value: "mes_pasado", label: "Mes pasado" },
  { value: "este_trimestre", label: "Este trimestre" },
  { value: "este_anio", label: "Este año" },
  { value: "personalizado", label: "Personalizado…" },
];

const SIMPLE: { key: "vertical" | "ae" | "carril" | "origen"; label: string; options: string[] }[] = [
  { key: "vertical", label: "Vertical", options: ["Todas", "Banca/Fintech", "Retail", "Salud", "Seguros", "BPO", "Sin definir"] },
  { key: "ae", label: "AE", options: ["Todos", "Andrés Sanjuán", "Edgardo Velasquez", "Michelle Sosa"] },
  { key: "carril", label: "Carril", options: ["Todos", "Mid-market", "Enterprise"] },
  { key: "origen", label: "Origen", options: ["Todos", "Andrés Sanjuán", "Laura Peña", "Zalesmachine", "Edgardo Velasquez", "Michelle Sosa"] },
];

function Selector({ label, value, options, onChange, active }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; active: boolean;
}) {
  return (
    <label className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs shadow-card transition-colors focus-within:border-[#3FA9FF] ${active ? "border-[#3FA9FF] bg-[#3FA9FF]/8" : "border-line bg-card"}`}>
      <span className="hidden text-ink-muted sm:inline">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer bg-transparent text-xs font-semibold text-ink outline-none">
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function Topbar({ title }: { title: string }) {
  const { filters, set, setPeriodo, reset, activeCount } = useFilters();
  const p = filters.periodo;
  const periodoActive = p.preset !== "todo";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 px-6 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight text-ink">{title}</h1>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* PERIODO: preset + personalizado */}
          <label className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs shadow-card transition-colors focus-within:border-[#3FA9FF] ${periodoActive ? "border-[#3FA9FF] bg-[#3FA9FF]/8" : "border-line bg-card"}`}>
            <span className="hidden text-ink-muted sm:inline">Periodo</span>
            <select
              value={p.preset}
              onChange={(e) => setPeriodo({ preset: e.target.value as Periodo["preset"] })}
              className="cursor-pointer bg-transparent text-xs font-semibold text-ink outline-none"
            >
              {PERIODO_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          {p.preset === "personalizado" && (
            <div className="flex items-center gap-1 rounded-lg border border-[#3FA9FF] bg-[#3FA9FF]/8 px-2 py-1 text-xs">
              <input type="date" value={p.from ?? ""} onChange={(e) => setPeriodo({ from: e.target.value || null })}
                className="bg-transparent text-xs font-semibold text-ink outline-none" />
              <span className="text-ink-muted">→</span>
              <input type="date" value={p.to ?? ""} onChange={(e) => setPeriodo({ to: e.target.value || null })}
                className="bg-transparent text-xs font-semibold text-ink outline-none" />
            </div>
          )}

          {/* Otros 4 filtros (se aplican en las siguientes partes) */}
          {SIMPLE.map((f) => (
            <Selector
              key={f.key}
              label={f.label}
              value={filters[f.key]}
              options={f.options}
              onChange={(v) => set({ [f.key]: v } as any)}
              active={filters[f.key] !== f.options[0]}
            />
          ))}

          {/* Limpiar + indicador de activos */}
          {activeCount > 0 ? (
            <button
              onClick={reset}
              className="ml-1 flex items-center gap-1 rounded-full border border-semaforo-amber/30 bg-semaforo-amber/12 px-2.5 py-1 text-[11px] font-semibold text-[#B9770F] transition-colors hover:bg-semaforo-amber/20"
              title={`Periodo: ${periodoLabel(p)}`}
            >
              ✕ Limpiar ({activeCount})
            </button>
          ) : (
            <span className="ml-1 rounded-full border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wide text-ink-muted">
              sin filtros
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
