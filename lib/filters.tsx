"use client";

// Estado GLOBAL de filtros del dashboard. Afecta las 3 secciones (Reuniones, Venta,
// Prospección) de forma consistente. Los filtros del usuario se SUMAN a los filtros base
// (operación México + equipo por IDs estables) que viven en cada loader; no los reemplazan.

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Periodo = {
  preset: "todo" | "este_mes" | "mes_pasado" | "este_trimestre" | "este_anio" | "personalizado";
  from: string | null; // 'YYYY-MM-DD' (solo modo personalizado)
  to: string | null;
};

export type Filters = {
  periodo: Periodo;
  vertical: string; // "Todas" = sin filtro
  ae: string; // "Todos"
  carril: string; // "Todos"
  origen: string; // "Todos" — persona (setter), aplica a Reuniones/Venta
  canal: string; // "Todos" — LinkedIn/Email, aplica a Prospección
};

export const DEFAULT_FILTERS: Filters = {
  periodo: { preset: "todo", from: null, to: null },
  vertical: "Todas",
  ae: "Todos",
  carril: "Todos",
  origen: "Todos",
  canal: "Todos",
};

// Resuelve un preset (o rango personalizado) a { from, to } en 'YYYY-MM-DD', o nulls = "todo".
export function resolvePeriodo(p: Periodo): { from: string | null; to: string | null } {
  if (p.preset === "personalizado") return { from: p.from, to: p.to };
  if (p.preset === "todo") return { from: null, to: null };
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const first = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 1));
  const last = (yy: number, mm: number) => new Date(Date.UTC(yy, mm + 1, 0));
  switch (p.preset) {
    case "este_mes":
      return { from: iso(first(y, m)), to: iso(last(y, m)) };
    case "mes_pasado":
      return { from: iso(first(y, m - 1)), to: iso(last(y, m - 1)) };
    case "este_trimestre": {
      const q = Math.floor(m / 3);
      return { from: iso(first(y, q * 3)), to: iso(last(y, q * 3 + 2)) };
    }
    case "este_anio":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    default:
      return { from: null, to: null };
  }
}

// ¿La fecha (string 'YYYY-MM-DD...' o null) cae dentro del periodo?
// Sin filtro ("todo") -> siempre true. Con filtro y fecha null -> false (excluida).
export function inPeriodo(dateStr: string | null | undefined, p: Periodo): boolean {
  const { from, to } = resolvePeriodo(p);
  if (!from && !to) return true;
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

// ¿La fila pasa el filtro Vertical? "Todas" = sin filtro. Compara contra el enum vertical.
export function matchVertical(v: string | null | undefined, filters: Filters): boolean {
  return filters.vertical === "Todas" || v === filters.vertical;
}

// ¿La fila pasa el filtro Carril? "Todos" = sin filtro. Compara contra el enum carril.
export function matchCarril(c: string | null | undefined, filters: Filters): boolean {
  return filters.carril === "Todos" || c === filters.carril;
}

// ¿La fila pasa el filtro AE? "Todos" = sin filtro. AE = OWNER del deal (quien cierra).
// Se compara por NOMBRE canónico del AE: en Venta pasar aeLabel(owner_id); en Reuniones
// pasar v_reuniones.ae (ya coincide con los nombres canónicos). NO aplica a Prospección.
export function matchAE(aeName: string | null | undefined, filters: Filters): boolean {
  return filters.ae === "Todos" || aeName === filters.ae;
}

// ¿La fila pasa el filtro Canal? "Todos" = sin filtro. Solo aplica a Prospección (fact_prospeccion.canal).
export function matchCanal(c: string | null | undefined, filters: Filters): boolean {
  return filters.canal === "Todos" || c === filters.canal;
}

// Etiqueta legible del periodo activo (para el indicador de filtros).
export function periodoLabel(p: Periodo): string {
  const map: Record<string, string> = {
    todo: "Todo",
    este_mes: "Este mes",
    mes_pasado: "Mes pasado",
    este_trimestre: "Este trimestre",
    este_anio: "Este año",
  };
  if (p.preset === "personalizado") return `${p.from ?? "…"} → ${p.to ?? "…"}`;
  return map[p.preset] ?? "Todo";
}

type Ctx = {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  setPeriodo: (patch: Partial<Periodo>) => void;
  reset: () => void;
  activeCount: number;
};

const FilterCtx = createContext<Ctx | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const set = useCallback((patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })), []);
  const setPeriodo = useCallback(
    (patch: Partial<Periodo>) => setFilters((f) => ({ ...f, periodo: { ...f.periodo, ...patch } })),
    []
  );
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.periodo.preset !== "todo") n++;
    if (filters.vertical !== "Todas") n++;
    if (filters.ae !== "Todos") n++;
    if (filters.carril !== "Todos") n++;
    if (filters.origen !== "Todos") n++;
    if (filters.canal !== "Todos") n++;
    return n;
  }, [filters]);

  return (
    <FilterCtx.Provider value={{ filters, set, setPeriodo, reset, activeCount }}>{children}</FilterCtx.Provider>
  );
}

export function useFilters(): Ctx {
  const c = useContext(FilterCtx);
  if (!c) throw new Error("useFilters debe usarse dentro de <FilterProvider>");
  return c;
}
