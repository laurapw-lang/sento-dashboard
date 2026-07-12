"use client";

// Entregabilidad: resumen global (warmup Active/Ramping/Paused, % Active, bounce/spam) +
// tabla por dominio. Semáforos consistentes (verde/ámbar/rojo).

type Row = Record<string, any>;
const n = (v: any) => (v == null ? 0 : Number(v) || 0);

// Chip de estado de warmup con color semáforo.
function WarmupChip({ label, count, tone }: { label: string; count: number; tone: "ok" | "warn" | "red" }) {
  const map = {
    ok: "border-semaforo-green/30 bg-semaforo-green/12 text-[#158060]",
    warn: "border-semaforo-amber/30 bg-semaforo-amber/12 text-[#B9770F]",
    red: "border-semaforo-red/30 bg-semaforo-red/12 text-[#C23B3A]",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${map[tone]}`}>
      <span className="tabular-nums font-bold">{count}</span> {label}
    </span>
  );
}

function pctColor(pct: number) {
  if (pct >= 95) return "#1D9E75";
  if (pct >= 80) return "#EF9F27";
  return "#E24B4A";
}

export function Entregabilidad({ dominios, resumen }: { dominios: Row[]; resumen: Row | null }) {
  return (
    <div className="mt-3 space-y-4">
      {/* Resumen global */}
      {resumen && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-card p-4 shadow-card">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Buzones</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{n(resumen.buzones)}</div>
            <div className="text-[11px] text-ink-muted">{n(resumen.dominios)} dominios</div>
          </div>
          <div className="rounded-xl border border-line bg-card p-4 shadow-card" style={{ borderLeftColor: pctColor(n(resumen.pct_active)), borderLeftWidth: 4 }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">% en Active</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{n(resumen.pct_active)}%</div>
            <div className="text-[11px] text-ink-muted">warmup saludable</div>
          </div>
          <div className="rounded-xl border border-line bg-card p-4 shadow-card">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Bounce rate</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{n(resumen.bounce_pct)}%</div>
          </div>
          <div className="rounded-xl border border-line bg-card p-4 shadow-card">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Spam</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{n(resumen.spam_pct)}%</div>
          </div>
        </div>
      )}

      {resumen && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-muted">Distribución warmup:</span>
          <WarmupChip label="Active" count={n(resumen.warmup_active)} tone="ok" />
          <WarmupChip label="Ramping" count={n(resumen.warmup_ramping)} tone="warn" />
          <WarmupChip label="Paused" count={n(resumen.warmup_paused)} tone="red" />
        </div>
      )}

      {/* Tabla por dominio */}
      <div className="rounded-xl border border-line bg-card p-4 shadow-card">
        <div className="mb-3 text-sm font-semibold text-ink">Salud por dominio</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="py-2 pr-3 font-semibold">Dominio</th>
                <th className="py-2 px-3 text-right font-semibold">Buzones</th>
                <th className="py-2 px-3 text-right font-semibold">Active</th>
                <th className="py-2 px-3 text-right font-semibold">Ramping</th>
                <th className="py-2 px-3 text-right font-semibold">Paused</th>
                <th className="py-2 px-3 text-right font-semibold">Bounce</th>
                <th className="py-2 pl-3 text-right font-semibold">Spam</th>
              </tr>
            </thead>
            <tbody>
              {dominios.map((d, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-ink">{d.dominio}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink">{n(d.buzones)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-[#158060]">{n(d.warmup_active)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-[#B9770F]">{n(d.warmup_ramping)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-[#C23B3A]">{n(d.warmup_paused)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{n(d.bounce_pct)}%</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-ink-muted">{n(d.spam_pct)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
