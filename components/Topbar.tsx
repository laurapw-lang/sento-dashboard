"use client";

// Barra de filtros globales (placeholder). Aún no filtran; se cablearán a estado global + queries.

const FILTERS: { label: string; options: string[] }[] = [
  { label: "Periodo", options: ["2026", "Jul 2026", "Ago 2026", "Sep 2026", "Q3 2026"] },
  { label: "Vertical", options: ["Todas", "Banca/Fintech", "Retail", "Seguros", "BPO", "Salud", "Sin definir"] },
  { label: "AE", options: ["Todos", "Andrés Sanjuán", "Edgardo Velasquez", "Michelle Sosa"] },
  { label: "Carril", options: ["Todos", "Mid-market", "Enterprise"] },
  { label: "Origen", options: ["Todos", "Zalesmachine", "Laura Peña", "Edgardo Velasquez"] },
];

export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 px-6 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight text-ink">{title}</h1>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <label
              key={f.label}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-xs text-ink-muted shadow-card transition-colors focus-within:border-[#3FA9FF] hover:border-slate-300"
            >
              <span className="hidden text-ink-muted sm:inline">{f.label}</span>
              <select defaultValue={f.options[0]} className="cursor-pointer bg-transparent text-xs font-semibold text-ink outline-none">
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <span className="ml-1 rounded-full border border-line bg-card px-2 py-1 text-[10px] uppercase tracking-wide text-ink-muted">
            filtros mock
          </span>
        </div>
      </div>
    </header>
  );
}
