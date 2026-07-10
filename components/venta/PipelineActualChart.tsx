"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PipelineBar } from "@/lib/ventaGraficas";
import { useDrilldown } from "../DrillDown";

const CAT_COLOR: Record<PipelineBar["cat"], string> = {
  activo: "#3FA9FF",
  ganado: "#1D9E75",
  perdido: "#E24B4A",
};
const money = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export function PipelineActualChart({ rows }: { rows: PipelineBar[] }) {
  const { open } = useDrilldown();

  return (
    <div className="flex flex-col rounded-xl border border-line bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3.5 w-1 rounded-full bg-spectrum-gradient" />
        <h3 className="text-sm font-semibold text-ink">Estado actual del pipeline</h3>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#EDF1F7" vertical={false} />
            <XAxis
              dataKey="etapa"
              tick={{ fontSize: 10, fill: "#5E6B82" }}
              axisLine={{ stroke: "#EDF1F7" }}
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={52}
            />
            <YAxis tick={{ fontSize: 11, fill: "#5E6B82" }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #E5E9F0", borderRadius: 10, fontSize: 12 }}
              cursor={{ fill: "rgba(63,169,255,0.08)" }}
              formatter={(v: number, _n: string, p: { payload?: PipelineBar }) => [`${v} deals · ${money(p?.payload?.mrr ?? 0)}`, "Actual"]}
            />
            <Bar
              dataKey="deals"
              radius={[5, 5, 0, 0]}
              maxBarSize={64}
              cursor="pointer"
              onClick={(d: { payload?: PipelineBar }) => d?.payload?.drill && open(d.payload.drill)}
            >
              {rows.map((r, i) => (
                <Cell key={i} fill={CAT_COLOR[r.cat]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: CAT_COLOR.activo }} />Activo</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: CAT_COLOR.ganado }} />Ganado</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: CAT_COLOR.perdido }} />Perdido</span>
      </div>
    </div>
  );
}
