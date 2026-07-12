"use client";

// Prospección → reunión por segmento (vertical × carril), desde v_funnel_prospeccion.
// Une la prospección (contactados/interesados — Fase 1, hoy 0) con las reuniones REALES
// (agendadas/calificadas de v_reuniones) por las mismas dimensiones. Atribución aproximada.

import { EmptyBlock } from "@/components/DataState";
import { Pill } from "@/components/Badge";

type Row = Record<string, any>;
const n = (v: any) => (v == null ? 0 : Number(v) || 0);

export function SegmentoReunion({ rows }: { rows: Row[] }) {
  if (!rows.length) return <div className="mt-3"><EmptyBlock label="Sin segmentos con reuniones todavía" /></div>;

  // Orden: más agendadas primero.
  const data = [...rows].sort((a, b) => n(b.agendadas) - n(a.agendadas));
  const totalAgendadas = data.reduce((s, r) => s + n(r.agendadas), 0);
  const totalCalif = data.reduce((s, r) => s + n(r.calificadas), 0);

  return (
    <div className="mt-3 rounded-xl border border-line bg-card p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">Recorrido por segmento</span>
        <Pill tone="ok">reuniones: dato real</Pill>
        <Pill tone="warn">contactados/interesados: Fase 1</Pill>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="py-2 pr-3 font-semibold">Segmento</th>
              <th className="py-2 px-3 text-right font-semibold">Contactados</th>
              <th className="py-2 px-3 text-right font-semibold">Interesados</th>
              <th className="py-2 px-3 text-right font-semibold text-[#158060]">Agendadas</th>
              <th className="py-2 pl-3 text-right font-semibold text-[#158060]">Calificadas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3">
                  <span className="font-medium text-ink">{r.vertical}</span>
                  <span className="text-ink-muted"> · {r.carril}</span>
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{n(r.contactados).toLocaleString("es-MX")}</td>
                <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{n(r.interesados).toLocaleString("es-MX")}</td>
                <td className="py-2 px-3 text-right font-semibold tabular-nums text-ink">{n(r.agendadas)}</td>
                <td className="py-2 pl-3 text-right font-semibold tabular-nums text-ink">{n(r.calificadas)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line text-sm">
              <td className="py-2 pr-3 font-semibold text-ink">Total</td>
              <td className="py-2 px-3 text-right tabular-nums text-ink-muted">0</td>
              <td className="py-2 px-3 text-right tabular-nums text-ink-muted">0</td>
              <td className="py-2 px-3 text-right font-bold tabular-nums text-[#158060]">{totalAgendadas}</td>
              <td className="py-2 pl-3 text-right font-bold tabular-nums text-[#158060]">{totalCalif}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ink-muted">
        ⚠️ <strong>Atribución aproximada por segmento.</strong> Las reuniones se unen a la prospección por
        vertical × carril (no lead↔deal). Las reuniones no se atribuyen a un canal concreto, y muchos deals aún
        están en “Sin definir” (el match por vertical es débil; el carril es más confiable). Agendadas/calificadas
        son del equipo México.
      </p>
    </div>
  );
}
