"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MotivoBar } from "@/lib/ventaGraficas";
import { useDrilldown } from "../DrillDown";

const COLORS = ["#E24B4A", "#EF9F27", "#7C5CFF", "#3FA9FF", "#29D3D3", "#2BD98C", "#9B8CFF"];

export function MotivosChart({ rows }: { rows: MotivoBar[] }) {
  const { open } = useDrilldown();

  return (
    <div className="flex flex-col rounded-xl border border-line bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3.5 w-1 rounded-full bg-spectrum-gradient" />
        <h3 className="text-sm font-semibold text-ink">Por qué perdemos</h3>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E9F0", borderRadius: 10, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#5E6B82" }} iconType="circle" />
            <Pie
              data={rows}
              dataKey="deals"
              nameKey="motivo"
              innerRadius={45}
              outerRadius={82}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              cursor="pointer"
              onClick={(d: MotivoBar & { payload?: MotivoBar }) => {
                const dr = d?.drill ?? d?.payload?.drill;
                if (dr) open(dr);
              }}
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
