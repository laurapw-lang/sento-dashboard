// Construye los KPIs/gráficas de la sección VENTA a partir de filas reales
// (fact_deals, metas, v_pipeline_objetivo). Toda la agregación se hace en JS
// (el volumen es pequeño: decenas de deals).

import type { Kpi, ChartSpec, DrillPayload, DealRow, MetaRow, PipelineObjetivoRow } from "./types";
import { fetchDeals, fetchMetas, fetchPipelineObjetivo } from "./db";
import { isAeVenta, aeLabel } from "./team";
import { inPeriodo, type Filters } from "./filters";

// Fecha de cierre del deal para el filtro de PERIODO: firma (ganados) o cierre estimado.
const cierreDate = (d: DealRow) => d.fecha_firma ?? d.fecha_cierre_est;

// Paleta espectro Sento para series de gráficas (no-semáforo).
const C = {
  indigo: "#3FA9FF", // embudo (cells lo sobreescriben)
  violet: "#7C5CFF", // por vertical
  fuchsia: "#7C5CFF", // por origen (pie, cells lo sobreescriben)
  cyan: "#29D3D3", // por AE
  teal: "#3FA9FF", // forecast
  amber: "#EF9F27",
};

const STAGE_ORDER = [
  "Lead Asignado",
  "Interés Inicial",
  "Demo Agendada",
  "Demo Realizada",
  "Caso de Negocio",
  "Propuesta Económica",
  "Negociación",
  "Contrato Final Enviado",
];

const n = (x: number | null | undefined) => x ?? 0;
const isOpen = (d: DealRow) => d.etapa !== "Ganado" && d.etapa !== "Perdido";

function sumBy(rows: DealRow[], keyOf: (d: DealRow) => string, valOf: (d: DealRow) => number) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r) || "Sin definir";
    m.set(k, (m.get(k) ?? 0) + valOf(r));
  }
  return Array.from(m.entries());
}

function dealsDrill(title: string, rows: DealRow[]): DrillPayload {
  return {
    title,
    subtitle: `${rows.length} deal(s)`,
    columns: [
      { key: "deal_id", label: "Deal" },
      { key: "cuenta", label: "Cuenta" },
      { key: "etapa", label: "Etapa" },
      { key: "vertical", label: "Vertical" },
      { key: "carril", label: "Carril" },
      { key: "mrr", label: "MRR", align: "right" },
      { key: "ae", label: "AE" },
    ],
    rows: rows.map((d) => ({
      deal_id: d.deal_id,
      cuenta: d.cuenta,
      etapa: d.etapa,
      vertical: d.vertical,
      carril: d.carril,
      mrr: n(d.mrr),
      ae: aeLabel(d.owner_id, d.ae), // etiqueta bonita por owner_id estable
    })),
  };
}

export type VentaData = {
  isEmpty: boolean;
  kpis: Kpi[];
  charts: ChartSpec[];
  dealsAtencion: DrillPayload;
  razonesPerdida: DrillPayload;
};

export function buildVenta(
  deals: DealRow[],
  metas: MetaRow[],
  pipe: PipelineObjetivoRow | null,
  filters: Filters
): VentaData {
  // Filtro de equipo por IDENTIFICADOR ESTABLE: solo deals cuyos owner_id ∈ AEs.
  // + Filtro de PERIODO (global) por fecha de cierre (firma/estimada). Se SUMAN al base.
  const teamDeals = deals
    .filter((d) => isAeVenta(d.owner_id))
    .filter((d) => inPeriodo(cierreDate(d), filters.periodo));

  const open = teamDeals.filter(isOpen);
  const ganados = teamDeals.filter((d) => d.etapa === "Ganado");
  const perdidos = teamDeals.filter((d) => d.etapa === "Perdido");

  const mrrCerrado = ganados.reduce((s, d) => s + n(d.mrr), 0);

  const metaMrr = metas.find((m) => m.tipo_meta === "mrr" && (m.entidad ?? "").toLowerCase().startsWith("operaci"));
  const metaLogos = metas.find((m) => m.tipo_meta === "logos");

  // ---- KPIs ----
  const kpis: Kpi[] = [
    {
      id: "mrr_cerrado",
      label: "MRR cerrado vs meta",
      value: mrrCerrado,
      meta: pipe?.meta_mrr ?? metaMrr?.meta_valor ?? null,
      unit: "money",
      tentativo: metaMrr?.tentativo ?? false,
      hint: "Meta anual 2026 (Operación México)",
      drill: dealsDrill("MRR cerrado — deals Ganados", ganados),
    },
    {
      id: "logos",
      label: "Logos cerrados vs meta",
      value: ganados.length,
      meta: metaLogos?.meta_valor ?? null,
      unit: "int",
      tentativo: metaLogos?.tentativo ?? false,
      hint: "Meta anual 2026",
      drill: dealsDrill("Logos cerrados — deals Ganados", ganados),
    },
    {
      id: "pipeline_objetivo",
      label: "Pipeline objetivo vs actual",
      value: n(pipe?.pipeline_actual ?? open.reduce((s, d) => s + n(d.mrr), 0)),
      meta: pipe?.pipeline_objetivo ?? null,
      unit: "money",
      tentativo: true, // depende del win_rate supuesto (0.20)
      hint: pipe
        ? `Objetivo = MRR anual / win_rate ${pipe.win_rate_sup ?? "?"}. Brecha: ${Math.round(n(pipe.brecha))}`
        : "Objetivo = MRR anual / win_rate (supuesto).",
      drill: dealsDrill("Pipeline actual — deals abiertos", open),
    },
  ];

  // ---- Charts ----
  const embudo: ChartSpec = {
    id: "embudo",
    title: "Pipeline por etapa (embudo)",
    type: "funnel",
    xKey: "etapa",
    series: [{ key: "deals", label: "Deals", color: C.indigo }],
    drill: dealsDrill("Deals abiertos por etapa", open),
    data: STAGE_ORDER.map((et) => ({
      etapa: et,
      deals: open.filter((d) => d.etapa === et).length,
    })),
  };

  const forecast: ChartSpec = {
    id: "forecast",
    title: "Forecast ponderado (MRR × prob) por etapa",
    type: "bar",
    xKey: "etapa",
    series: [{ key: "ponderado", label: "MRR ponderado", color: C.teal }],
    tentativo: true, // depende de la prob capturada en el CRM
    data: STAGE_ORDER.map((et) => ({
      etapa: et,
      ponderado: Math.round(
        open.filter((d) => d.etapa === et).reduce((s, d) => s + n(d.mrr) * n(d.prob), 0)
      ),
    })).filter((r) => (r.ponderado as number) > 0),
  };

  const porAe: ChartSpec = {
    id: "por_ae",
    title: "Pipeline por AE",
    type: "bar",
    xKey: "ae",
    series: [{ key: "mrr", label: "MRR pipeline", color: C.cyan }],
    data: sumBy(open, (d) => aeLabel(d.owner_id, d.ae), (d) => n(d.mrr)).map(([ae, mrr]) => ({ ae, mrr })),
  };

  const porOrigen: ChartSpec = {
    id: "por_origen",
    title: "Pipeline por origen",
    type: "pie",
    xKey: "origen",
    series: [{ key: "mrr", label: "MRR", color: C.fuchsia }],
    data: sumBy(open, (d) => d.origen ?? "Sin origen", (d) => n(d.mrr)).map(([origen, mrr]) => ({ origen, mrr })),
  };

  const porVertical: ChartSpec = {
    id: "por_vertical",
    title: "Pipeline por vertical",
    type: "bar",
    xKey: "vertical",
    series: [{ key: "mrr", label: "MRR", color: C.violet }],
    data: sumBy(open, (d) => d.vertical ?? "Sin definir", (d) => n(d.mrr)).map(([vertical, mrr]) => ({ vertical, mrr })),
  };

  // ---- Tablas ----
  const atencion = open
    .filter((d) => n(d.dias_en_etapa) >= 14 || n(d.dias_sin_actividad) >= 10)
    .sort((a, b) => n(b.dias_en_etapa) - n(a.dias_en_etapa));

  const dealsAtencion: DrillPayload = {
    title: "Deals que requieren atención (estancados)",
    columns: [
      { key: "cuenta", label: "Cuenta" },
      { key: "etapa", label: "Etapa" },
      { key: "dias", label: "Días en etapa", align: "right" },
      { key: "ae", label: "AE" },
      { key: "siguiente", label: "Siguiente paso" },
    ],
    rows: atencion.map((d) => ({
      cuenta: d.cuenta,
      etapa: d.etapa,
      dias: n(d.dias_en_etapa),
      ae: aeLabel(d.owner_id, d.ae),
      siguiente: d.siguiente_paso ?? "—",
    })),
  };

  const razonesMap = new Map<string, { deals: number; mrr: number }>();
  for (const d of perdidos) {
    const k = d.winloss_razon || "Sin razón";
    const cur = razonesMap.get(k) ?? { deals: 0, mrr: 0 };
    razonesMap.set(k, { deals: cur.deals + 1, mrr: cur.mrr + n(d.mrr) });
  }
  const razonesPerdida: DrillPayload = {
    title: "Razones de pérdida",
    columns: [
      { key: "razon", label: "Razón" },
      { key: "deals", label: "Deals", align: "right" },
      { key: "mrr", label: "MRR perdido", align: "right" },
    ],
    rows: Array.from(razonesMap.entries())
      .sort((a, b) => b[1].deals - a[1].deals)
      .map(([razon, v]) => ({ razon, deals: v.deals, mrr: v.mrr })),
  };

  return {
    isEmpty: teamDeals.length === 0,
    kpis,
    charts: [embudo, forecast, porAe, porOrigen, porVertical],
    dealsAtencion,
    razonesPerdida,
  };
}

// Fetch CRUDO (una vez). La página construye con useMemo(buildVenta(raw, filters)).
export async function fetchVentaRaw(): Promise<{
  deals: DealRow[];
  metas: MetaRow[];
  pipe: PipelineObjetivoRow | null;
}> {
  const [deals, metas, pipe] = await Promise.all([fetchDeals(), fetchMetas(), fetchPipelineObjetivo()]);
  return { deals, metas, pipe };
}
