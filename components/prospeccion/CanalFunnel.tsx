"use client";

// Embudo de un canal (LinkedIn o Email) con barras horizontales proporcionales.
// La conversión mostrada es respecto a la etapa anterior.

type Etapa = { etapa: string; valor: number; orden: number };

export function CanalFunnel({ titulo, rows, color }: { titulo: string; rows: Etapa[]; color: string }) {
  const sorted = [...rows].sort((a, b) => a.orden - b.orden);
  const top = sorted.length ? Math.max(1, sorted[0].valor) : 1;

  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full" style={{ background: color }} />
        <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
      </div>

      <div className="space-y-1.5">
        {sorted.map((s, i) => {
          const w = Math.round((s.valor / top) * 100);
          const prev = i > 0 ? sorted[i - 1].valor : null;
          const conv = prev && prev > 0 ? s.valor / prev : null;
          return (
            <div key={s.etapa} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-xs font-medium text-ink-muted">{s.etapa}</span>
              <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-canvas">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{ width: `${w}%`, background: color }}
                />
                <span className="absolute inset-y-0 left-2.5 flex items-center text-xs font-bold tabular-nums text-ink">
                  {s.valor.toLocaleString("es-MX")}
                </span>
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-ink-muted">
                {i === 0 ? "inicio" : conv == null ? "—" : `${Math.round(conv * 100)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
