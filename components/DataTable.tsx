import type { Column } from "@/lib/types";

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
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`whitespace-nowrap px-3 py-2 ${
                    c.align === "right" ? "text-right tabular-nums text-ink-muted" : "text-left"
                  }`}
                >
                  {r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
