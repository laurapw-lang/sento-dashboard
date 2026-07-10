// Datos MOCK del dashboard. Reflejan el modelo real (fact_deals, metas, v_reuniones,
// v_pipeline_objetivo) pero NO vienen de Supabase todavía. Reemplazar en el paso de conexión.

import type { Kpi, ChartSpec, DrillPayload } from "./types";

const C = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  cyan: "#22d3ee",
  teal: "#2dd4bf",
  amber: "#f59e0b",
  rose: "#fb7185",
};

// ---------- drill-down de ejemplo (filas que componen un número) ----------
const dealsMx: DrillPayload = {
  title: "Deals · Operación México (Analytics)",
  subtitle: "Filas que componen el número (mock)",
  columns: [
    { key: "deal_id", label: "Deal" },
    { key: "cuenta", label: "Cuenta" },
    { key: "etapa", label: "Etapa" },
    { key: "vertical", label: "Vertical" },
    { key: "carril", label: "Carril" },
    { key: "mrr", label: "MRR", align: "right" },
    { key: "ae", label: "AE" },
  ],
  rows: [
    { deal_id: "1734", cuenta: "Grupo Flexi", etapa: "Demo Realizada", vertical: "Retail", carril: "Enterprise", mrr: 0, ae: "Edd" },
    { deal_id: "1670", cuenta: "Santander México", etapa: "Interés Inicial", vertical: "Banca/Fintech", carril: "Enterprise", mrr: 3200, ae: "Michelle" },
    { deal_id: "1722", cuenta: "BanBajío", etapa: "Caso de Negocio", vertical: "Banca/Fintech", carril: "Mid-market", mrr: 2800, ae: "Edgardo" },
    { deal_id: "1708", cuenta: "Safelink Group", etapa: "Demo Agendada", vertical: "Sin definir", carril: "Mid-market", mrr: 1500, ae: "Michelle" },
    { deal_id: "1723", cuenta: "Buk", etapa: "Propuesta Económica", vertical: "Sin definir", carril: "Mid-market", mrr: 1650, ae: "Edgardo" },
  ],
};

// =====================================================================
// SECCIÓN 1 — VENTA / PIPELINE
// =====================================================================
export const ventaKpis: Kpi[] = [
  { id: "mrr_cerrado", label: "MRR cerrado vs meta", value: 12500, meta: 37200, unit: "money", hint: "Meta anual 2026 (Operación México)", drill: dealsMx },
  { id: "logos", label: "Logos cerrados vs meta", value: 4, meta: 18, unit: "int", hint: "Meta anual 2026", drill: dealsMx },
  {
    id: "pipeline_objetivo",
    label: "Pipeline objetivo vs actual",
    value: 98000,      // pipeline actual (mock)
    meta: 186000,      // objetivo = meta_mrr / win_rate (37200 / 0.20)
    unit: "money",
    tentativo: true,   // depende del win_rate supuesto (0.20)
    hint: "Objetivo = MRR anual / win_rate 0.20 (supuesto). Actual = suma MRR de deals abiertos.",
    drill: dealsMx,
  },
];

export const ventaCharts: ChartSpec[] = [
  {
    id: "embudo",
    title: "Pipeline por etapa (embudo Analytics)",
    type: "funnel",
    xKey: "etapa",
    series: [{ key: "deals", label: "Deals", color: C.indigo }],
    drill: dealsMx,
    data: [
      { etapa: "Lead asignado", deals: 42 },
      { etapa: "Interés Inicial", deals: 28 },
      { etapa: "Demo Agendada", deals: 19 },
      { etapa: "Demo Realizada", deals: 12 },
      { etapa: "Caso de Negocio", deals: 8 },
      { etapa: "Propuesta", deals: 5 },
      { etapa: "Negociación", deals: 3 },
      { etapa: "Contrato", deals: 2 },
    ],
  },
  {
    id: "forecast",
    title: "Forecast del mes",
    type: "bar",
    xKey: "cat",
    series: [
      { key: "commit", label: "Commit", color: C.teal },
      { key: "best", label: "Best case", color: C.violet },
    ],
    data: [
      { cat: "Jul", commit: 5000, best: 9000 },
      { cat: "Ago", commit: 7500, best: 13000 },
      { cat: "Sep", commit: 9000, best: 15000 },
    ],
  },
  {
    id: "por_ae",
    title: "Pipeline por AE",
    type: "bar",
    xKey: "ae",
    series: [{ key: "mrr", label: "MRR pipeline", color: C.cyan }],
    drill: dealsMx,
    data: [
      { ae: "Michelle", mrr: 52000 },
      { ae: "Edgardo", mrr: 46000 },
    ],
  },
  {
    id: "por_origen",
    title: "Pipeline por origen",
    type: "pie",
    xKey: "origen",
    series: [{ key: "mrr", label: "MRR", color: C.fuchsia }],
    data: [
      { origen: "Zalesmachine", mrr: 41000 },
      { origen: "Edgardo Velasquez", mrr: 22000 },
      { origen: "Laura Peña", mrr: 18000 },
      { origen: "Otro", mrr: 17000 },
    ],
  },
  {
    id: "por_vertical",
    title: "Pipeline por vertical",
    type: "bar",
    xKey: "vertical",
    series: [{ key: "mrr", label: "MRR", color: C.violet }],
    data: [
      { vertical: "Banca/Fintech", mrr: 39000 },
      { vertical: "Retail", mrr: 24000 },
      { vertical: "Seguros", mrr: 15000 },
      { vertical: "BPO", mrr: 12000 },
      { vertical: "Sin definir", mrr: 8000 },
    ],
  },
];

export const dealsAtencion: DrillPayload = {
  title: "Deals que requieren atención (estancados)",
  columns: [
    { key: "cuenta", label: "Cuenta" },
    { key: "etapa", label: "Etapa" },
    { key: "dias", label: "Días en etapa", align: "right" },
    { key: "ae", label: "AE" },
    { key: "siguiente", label: "Siguiente paso" },
  ],
  rows: [
    { cuenta: "Liverpool", etapa: "Demo Realizada", dias: 21, ae: "Edd", siguiente: "—" },
    { cuenta: "Grupo Elektra", etapa: "Interés Inicial", dias: 17, ae: "Michelle", siguiente: "Reenviar propuesta" },
    { cuenta: "Sofía", etapa: "Caso de Negocio", dias: 14, ae: "Edgardo", siguiente: "Llamada de seguimiento" },
  ],
};

export const razonesPerdida: DrillPayload = {
  title: "Razones de pérdida",
  columns: [
    { key: "razon", label: "Razón" },
    { key: "deals", label: "Deals", align: "right" },
    { key: "mrr", label: "MRR perdido", align: "right" },
  ],
  rows: [
    { razon: "Precio", deals: 3, mrr: 9200 },
    { razon: "Timing", deals: 2, mrr: 5400 },
    { razon: "Competencia (Genesys)", deals: 2, mrr: 7100 },
    { razon: "Sin presupuesto", deals: 1, mrr: 1800 },
  ],
};

// =====================================================================
// SECCIÓN 2 — REUNIONES (la más importante)
// =====================================================================
export const reunionesKpis: Kpi[] = [
  { id: "calif_agendadas", label: "Reuniones calificadas agendadas vs meta", value: 38, meta: 60, unit: "int", hint: "Métrica principal. Meta = suma de metas mensuales del equipo.", drill: reunionesDrill() },
  { id: "agendadas", label: "Agendadas totales", value: 71, unit: "int", drill: reunionesDrill() },
  { id: "realizadas", label: "Realizadas", value: 49, unit: "int", drill: reunionesDrill() },
  { id: "calif_realizadas", label: "Calificadas realizadas", value: 27, unit: "int", drill: reunionesDrill() },
  { id: "show_rate", label: "Show rate", value: 0.69, unit: "pct", hint: "Realizadas / Agendadas" },
  { id: "tasa_calif", label: "Tasa de calificación", value: 0.54, unit: "pct", hint: "Calificadas / Agendadas", tentativo: true },
];

function reunionesDrill(): DrillPayload {
  return {
    title: "Reuniones (v_reuniones) — mock",
    columns: [
      { key: "cuenta", label: "Cuenta" },
      { key: "mes", label: "Mes" },
      { key: "agendado_por", label: "Agendó (proxy)" },
      { key: "ae", label: "AE" },
      { key: "es_calificada", label: "Calificada" },
      { key: "etapa", label: "Etapa" },
    ],
    rows: [
      { cuenta: "Grupo Flexi", mes: "2026-06", agendado_por: "Edgardo Velasquez", ae: "Edd", es_calificada: "no", etapa: "Demo Realizada" },
      { cuenta: "Safelink Group", mes: "2026-06", agendado_por: "Zalesmachine", ae: "Michelle", es_calificada: "no", etapa: "Demo Agendada" },
      { cuenta: "BanBajío", mes: "2026-07", agendado_por: "Laura Peña", ae: "Edgardo", es_calificada: "sí", etapa: "Caso de Negocio" },
    ],
  };
}

// Desglose por persona (metas cambian por mes; aquí acumulado del mes actual mock)
export const reunionesPorPersona: ChartSpec = {
  id: "reu_persona",
  title: "Reuniones calificadas agendadas — por persona (vs meta del mes)",
  type: "bar",
  xKey: "persona",
  series: [
    { key: "real", label: "Real", color: C.cyan },
    { key: "meta", label: "Meta", color: C.indigo },
  ],
  drill: reunionesDrill(),
  data: [
    { persona: "Laura (BDR)", real: 11, meta: 15 },
    { persona: "Michelle (AE)", real: 8, meta: 10 },
    { persona: "Edgardo (AE)", real: 9, meta: 10 },
    { persona: "Zalesmachine (SDR)", real: 10, meta: 15 },
  ],
};

export const reunionesPorCanal: ChartSpec = {
  id: "reu_canal",
  title: "Reuniones por canal",
  type: "pie",
  xKey: "canal",
  series: [{ key: "reuniones", label: "Reuniones", color: C.teal }],
  data: [
    { canal: "Email (Smartlead)", reuniones: 22 },
    { canal: "LinkedIn (HeyReach)", reuniones: 18 },
    { canal: "Zalesmachine", reuniones: 24 },
    { canal: "Referido/otro", reuniones: 7 },
  ],
};

export const reunionesMensual: ChartSpec = {
  id: "reu_mensual",
  title: "Vista mensual — calificadas agendadas (real vs meta)",
  type: "line",
  xKey: "mes",
  series: [
    { key: "real", label: "Real", color: C.fuchsia },
    { key: "meta", label: "Meta equipo", color: C.violet },
  ],
  data: [
    { mes: "Jul", real: 38, meta: 50 },
    { mes: "Ago", real: 0, meta: 60 },
    { mes: "Sep", real: 0, meta: 60 },
    { mes: "Oct", real: 0, meta: 60 },
    { mes: "Nov", real: 0, meta: 60 },
    { mes: "Dic", real: 0, meta: 60 },
  ],
};

// =====================================================================
// SECCIÓN 4 — INSIGHTS IA
// =====================================================================
export const insightsMock = [
  { id: "i1", tag: "Reuniones", text: "Zalesmachine aporta el 34% de las reuniones pero solo 12% de las calificadas — revisar targeting.", sev: "warn" },
  { id: "i2", tag: "Pipeline", text: "Banca/Fintech concentra el 40% del MRR de pipeline; 2 deals estancados >14 días en Caso de Negocio.", sev: "info" },
  { id: "i3", tag: "Calidad", text: "Tasa de calificación (54%) por debajo del objetivo; falta poblar 'Graban llamadas' y volumen en el CRM.", sev: "warn" },
  { id: "i4", tag: "Forecast", text: "Con win_rate supuesto 0.20, se necesita 88k más de pipeline para cubrir el objetivo anual.", sev: "info" },
] as const;
