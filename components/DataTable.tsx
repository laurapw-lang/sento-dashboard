import type { Column } from "@/lib/types";
import { pipedriveDealUrl } from "@/lib/pipedrive";
import { pipelineMeta } from "@/lib/pipeline";

const money = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export function PipelineChip({ nombre }: { nombre: string | null | undefined }) {
  const p = pipelineMeta(nombre);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: p.color, backgroundColor: p.soft }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
      {p.nombre}
    </span>
  );
}

function Cell({ c, r }: { c: Column; r: Record<string, string | number | null> }) {
  const raw = r[c.key];
  const val = raw ?? "—";
  const dealId = r["deal_id"];

  if (c.type === "dealLink" && dealId != null && dealId !== "") {
    return (
      <a
        href={pipedriveDealUrl(dealId as string | number)}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir en Pipedrive ↗"
        className="group inline-flex items-center gap-1 font-medium text-[#2478C7] underline decoration-[#2478C7]/30 underline-offset-2 transition-colors hover:decoration-[#2478C7]"
      >
        {val}
        <span aria-hidden className="text-[10px] opacity-50 transition-opacity group-hover:opacity-100">↗</span>
      </a>
    );
  }
  if (c.type === "pipeline") return <PipelineChip nombre={raw as string} />;
  if (c.type === "si_no") {
    const s = String(raw ?? "").toLowerCase();
    const tone =
      s === "sí" || s === "si"
        ? "bg-semaforo-green/15 text-[#158060]"
        : s === "no"
        ? "bg-slate-100 text-ink-muted"
        : "bg-semaforo-amber/15 text-[#B9770F]";
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{val}</span>;
  }
  if (c.type === "money" && typeof raw === "number") return <>{money(raw)}</>;
  return <>{val}</>;
}

export function DataTable({
  columns,
  rows,
}: {
  columns: Column[];
  rows: Record<string, string | number | null>[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas text-ink-muted">
            {columns.map((c) => (
              <th
                key={c.key}
                title={c.hint}
                className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
                  c.align === "right" ? "text-right" : "text-left"
                } ${c.hint ? "cursor-help" : ""}`}
              >
                {c.label}
                {c.hint && <span className="ml-0.5 text-ink-muted/70">ⓘ</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-ink-muted">
                Sin filas
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60 text-ink transition-colors last:border-0 hover:bg-canvas">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`whitespace-nowrap px-3 py-2 ${
                    c.align === "right" ? "text-right tabular-nums text-ink-muted" : "text-left"
                  }`}
                >
                  <Cell c={c} r={r} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
