"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/lib/types";
import { TentativoBadge } from "./Badge";
import { useDrilldown } from "./DrillDown";

// Paleta de series diferenciable (espectro Sento + extras) para gráficas NO-semáforo.
const SERIES_COLORS = ["#7C5CFF", "#3FA9FF", "#29D3D3", "#2BD98C", "#EF9F27", "#E24B4A", "#9B8CFF"];
const AXIS = { fontSize: 11, fill: "#5E6B82" };
const GRID = "#EDF1F7";

const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E9F0",
  borderRadius: 10,
  color: "#1A2130",
  fontSize: 12,
  boxShadow: "0 8px 24px -8px rgba(16,24,40,0.18)",
};

const legendStyle = { fontSize: 11, color: "#5E6B82", paddingTop: 6 };

export function ChartCard({ spec }: { spec: ChartSpec }) {
  const { open } = useDrilldown();
  const clickable = !!spec.drill;
  const multi = spec.series.length > 1;

  return (
    <div className="flex flex-col rounded-xl border border-line bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-spectrum-gradient" />
          <h3 className="text-sm font-semibold text-ink">{spec.title}</h3>
          {spec.tentativo && <TentativoBadge />}
        </div>
        {clickable && (
          <button
            onClick={() => spec.drill && open(spec.drill)}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-canvas hover:text-[#2478C7]"
          >
            ver detalle ↗
          </button>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(spec, multi)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function renderChart(spec: ChartSpec, multi: boolean) {
  switch (spec.type) {
    case "line":
      return (
        <LineChart data={spec.data} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={spec.xKey} tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#CBD5E1" }} />
          {multi && <Legend wrapperStyle={legendStyle} iconType="plainline" />}
          {spec.series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={{ r: 3, fill: s.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      );

    case "pie":
      return (
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} iconType="circle" />
          <Pie
            data={spec.data}
            dataKey={spec.series[0].key}
            nameKey={spec.xKey}
            innerRadius={48}
            outerRadius={82}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {spec.data.map((_, i) => (
              <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      );

    // "funnel" = barras horizontales ordenadas (embudo simple)
    case "funnel":
      return (
        <BarChart data={spec.data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 24 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey={spec.xKey} tick={AXIS} axisLine={false} tickLine={false} width={120} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(63,169,255,0.08)" }} />
          <Bar dataKey={spec.series[0].key} name={spec.series[0].label} radius={[0, 5, 5, 0]} barSize={18}>
            {spec.data.map((_, i) => (
              <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      );

    case "bar":
    default:
      return (
        <BarChart data={spec.data} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={spec.xKey} tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(63,169,255,0.08)" }} />
          {multi && <Legend wrapperStyle={legendStyle} iconType="circle" />}
          {spec.series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[5, 5, 0, 0]} maxBarSize={54} />
          ))}
        </BarChart>
      );
  }
}
