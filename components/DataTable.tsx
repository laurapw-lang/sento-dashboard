import type { Column } from "@/lib/types";
import { pipedriveDealUrl } from "@/lib/pipedrive";

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
                className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.label}
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
              {columns.map((c) => {
                const val = r[c.key] ?? "—";
                const dealId = r["deal_id"];
                const isDealLink = c.type === "dealLink" && dealId != null && dealId !== "";
                return (
                  <td
                    key={c.key}
                    className={`whitespace-nowrap px-3 py-2 ${
                      c.align === "right" ? "text-right tabular-nums text-ink-muted" : "text-left"
                    }`}
                  >
                    {isDealLink ? (
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
                    ) : (
                      val
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
