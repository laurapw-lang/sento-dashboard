// Construye la sección VENTA desde fact_deals (+ pipeline derivado), metas y v_pipeline_objetivo.
// Toda la agregación se hace en JS (decenas de deals).
//
// Cómo se aplica el PERIODO (cada bloque usa la fecha que tiene sentido):
//   · Pipeline abierto, estancados y perdidos → FOTO DE HOY (no tienen fecha de cierre).
//   · Ganados en el periodo                   → fecha_firma (won_time, cuándo se ganó).
//   · Embudo                                  → cohorte por fecha_agendado (deals que ENTRARON en el periodo).
//   · MRR / logos vs meta anual               → acumulado del AÑO (la meta es anual).

import type { DrillPayload, DealRow, MetaRow, PipelineObjetivoRow } from "./types";
import { fetchDeals, fetchMetas, fetchPipelineObjetivo } from "./db";
import { isAeVenta, aeLabel, matchOrigen } from "./team";
import { inPeriodo, matchVertical, matchCarril, matchAE, matchPipeline, periodoLabel, type Filters } from "./filters";
import { PIPELINES, stageRank, type PipelineName } from "./pipeline";
import type { BoardCard } from "@/components/viz";

export const STAGE_ORDER = [
  "Lead Asignado",
  "Interés Inicial",
  "Demo Agendada",
  "Demo Realizada",
  "Caso de Negocio",
  "Propuesta Económica",
  "Negociación",
  "Contrato Final Enviado",
];

const MOTIVO_LABELS: Record<string, string> = {
  "15": "Sin presupuesto / No aprobaron el gasto",
  "16": "Sin respuesta / Ghosting",
  "17": "No era el momento",
  "18": "Champion no pudo vender internamente",
  "47": "Eligieron a otro competidor",
  "48": "Eligieron solución interna",
  "64": "No calificó — no graban / chats no centralizados",
  "272": "No calificó — volumen insuficiente",
  "273": "Deal duplicado / Error de ingreso",
};

const n = (x: number | null | undefined) => x ?? 0;
const isOpen = (d: DealRow) => d.etapa !== "Ganado" && d.etapa !== "Perdido";
const canalOf = (d: DealRow) => d.canal_entrada || "Sin clasificar";
const motivoOf = (d: DealRow) =>
  (d.motivo_perdida_option_id && MOTIVO_LABELS[d.motivo_perdida_option_id]) || d.winloss_razon || "Sin motivo capturado";
// Etapa máxima alcanzada (1..8); Ganado = 9. Funciona para Analytics y Voice Agent.
const effRank = (d: DealRow) => (d.etapa === "Ganado" ? 9 : stageRank(d.max_stage_id) ?? 0);

export function dealsDrill(title: string, rows: DealRow[], subtitle?: string): DrillPayload {
  return {
    title,
    subtitle: subtitle ?? `${rows.length} deal(s) · ${rows.reduce((s, d) => s + n(d.mrr), 0).toLocaleString("es-MX")} MRR`,
    columns: [
      { key: "cuenta", label: "Cuenta", type: "dealLink" },
      { key: "pipeline", label: "Pipeline", type: "pipeline" },
      { key: "etapa", label: "Etapa hoy" },
      { key: "mrr", label: "MRR", align: "right", type: "money" },
      { key: "ae", label: "AE" },
      { key: "canal", label: "Canal" },
      { key: "vertical", label: "Vertical" },
    ],
    rows: [...rows]
      .sort((a, b) => n(b.mrr) - n(a.mrr))
      .map((d) => ({
        deal_id: d.deal_id,
        cuenta: d.cuenta,
        pipeline: d.pipeline,
        etapa: d.etapa,
        mrr: n(d.mrr),
        ae: aeLabel(d.owner_id, d.ae),
        canal: canalOf(d),
        vertical: d.vertical,
      })),
  };
}

export type FunnelStage = { rank: number; etapa: string; alcanzaron: number; conv: number | null; drill: DrillPayload };
export type PipelineBar = { etapa: string; deals: number; mrr: number; cat: "activo" | "ganado" | "perdido"; drill: DrillPayload };
export type MotivoBar = { motivo: string; deals: number; drill: DrillPayload };
export type PipelineCard = { nombre: PipelineName; color: string; abiertos: number; mrr: number; ganados: number; drill: DrillPayload };
export type Barra = { label: string; valor: number; drill: DrillPayload };

export type VentaData = {
  periodo: string;
  isEmpty: boolean;
  abierto: { deals: number; mrr: number; ponderado: number; objetivo: number | null; drill: DrillPayload };
  ganadosPeriodo: { deals: number; mrr: number; drill: DrillPayload };
  anio: { mrr: number; metaMrr: number | null; logos: number; metaLogos: number | null; drill: DrillPayload };
  porPipeline: PipelineCard[];
  funnel: FunnelStage[];
  estado: PipelineBar[];
  motivos: MotivoBar[];
  porAe: Barra[];
  porCanal: { canal: string; activo: number; ganado: number; perdido: number }[];
  canalDrill: DrillPayload;
  atencion: DrillPayload;
  board: BoardCard[]; // pipeline abierto, una tarjeta por deal (tablero kanban)
  porVertical: { nombre: string; mrr: number; deals: number }[];
  aeEtapa: Record<string, string | number>[]; // deals abiertos por AE apilados por etapa
};

export function buildVenta(deals: DealRow[], metas: MetaRow[], pipe: PipelineObjetivoRow | null, filters: Filters): VentaData {
  // Equipo AE por owner_id (ESTABLE) + segmento. El PERIODO se aplica por bloque (ver cabecera).
  const seg = deals
    .filter((d) => isAeVenta(d.owner_id))
    .filter((d) => matchVertical(d.vertical, filters))
    .filter((d) => matchCarril(d.carril, filters))
    .filter((d) => matchAE(aeLabel(d.owner_id, d.ae), filters))
    .filter((d) => matchOrigen(d.agendado_por_option_id, filters.origen))
    .filter((d) => matchPipeline(d.pipeline, filters));

  const open = seg.filter(isOpen);
  const perdidos = seg.filter((d) => d.etapa === "Perdido");
  const ganadosPer = seg.filter((d) => d.etapa === "Ganado" && inPeriodo(d.fecha_firma, filters.periodo));
  const y = String(new Date().getFullYear());
  const ganadosAnio = seg.filter((d) => d.etapa === "Ganado" && String(d.fecha_firma ?? "").startsWith(y));
  const sumMrr = (rows: DealRow[]) => rows.reduce((s, d) => s + n(d.mrr), 0);

  const metaMrr = metas.find((m) => m.tipo_meta === "mrr" && (m.entidad ?? "").toLowerCase().startsWith("operaci"));
  const metaLogos = metas.find((m) => m.tipo_meta === "logos");

  // Embudo: cohorte de deals que ENTRARON en el periodo, por etapa máxima alcanzada.
  const cohorte = seg.filter((d) => inPeriodo(d.fecha_agendado ?? null, filters.periodo));
  const alc = STAGE_ORDER.map((_, i) => cohorte.filter((d) => effRank(d) >= i + 1).length);
  const funnel: FunnelStage[] = STAGE_ORDER.map((etapa, i) => ({
    rank: i + 1,
    etapa,
    alcanzaron: alc[i],
    conv: i === 0 ? 1 : alc[i - 1] > 0 ? alc[i] / alc[i - 1] : null,
    drill: dealsDrill(`Llegaron a “${etapa}” o más`, cohorte.filter((d) => effRank(d) >= i + 1)),
  }));

  // Estado de hoy por etapa (abiertos + ganados + perdidos), oculta etapas vacías.
  const estado: PipelineBar[] = [...STAGE_ORDER, "Ganado", "Perdido"]
    .map((etapa) => {
      const t = seg.filter((d) => d.etapa === etapa);
      return {
        etapa,
        deals: t.length,
        mrr: sumMrr(t),
        cat: (etapa === "Ganado" ? "ganado" : etapa === "Perdido" ? "perdido" : "activo") as PipelineBar["cat"],
        drill: dealsDrill(`Deals en “${etapa}”`, t),
      };
    })
    .filter((r) => r.deals > 0);

  const motivosMap = new Map<string, DealRow[]>();
  for (const d of perdidos) motivosMap.set(motivoOf(d), [...(motivosMap.get(motivoOf(d)) ?? []), d]);
  // Top 6 motivos + "Otros" (hay motivos en texto libre que fragmentan la gráfica).
  const ordenados = Array.from(motivosMap.entries()).sort((a, b) => b[1].length - a[1].length);
  const otros = ordenados.slice(6).flatMap(([, rows]) => rows);
  const motivos: MotivoBar[] = [
    ...ordenados.slice(0, 6).map(([motivo, rows]) => ({ motivo, deals: rows.length, drill: dealsDrill(`Perdidos: ${motivo}`, rows) })),
    ...(otros.length ? [{ motivo: `Otros (${ordenados.length - 6} motivos)`, deals: otros.length, drill: dealsDrill("Perdidos: otros motivos", otros) }] : []),
  ];

  const aeMap = new Map<string, DealRow[]>();
  for (const d of open) {
    const k = aeLabel(d.owner_id, d.ae);
    aeMap.set(k, [...(aeMap.get(k) ?? []), d]);
  }
  const porAe: Barra[] = Array.from(aeMap.entries())
    .map(([label, rows]) => ({ label, valor: sumMrr(rows), drill: dealsDrill(`Pipeline abierto de ${label}`, rows) }))
    .sort((a, b) => b.valor - a.valor);

  const CANAL_ORDER = ["LinkedIn", "Email", "WhatsApp", "Llamada", "Evento", "Referido", "Sin clasificar"];
  const porCanal = CANAL_ORDER.filter((c) => seg.some((d) => canalOf(d) === c)).map((canal) => {
    const t = seg.filter((d) => canalOf(d) === canal);
    return {
      canal,
      activo: t.filter(isOpen).length,
      ganado: t.filter((d) => d.etapa === "Ganado").length,
      perdido: t.filter((d) => d.etapa === "Perdido").length,
    };
  });

  const atencionRows = open
    .filter((d) => n(d.dias_en_etapa) >= 14 || n(d.dias_sin_actividad) >= 10)
    .sort((a, b) => n(b.dias_sin_actividad) - n(a.dias_sin_actividad));
  const atencion: DrillPayload = {
    title: "Deals que requieren atención",
    subtitle: "Abiertos con ≥14 días en la misma etapa o ≥10 días sin actividad.",
    columns: [
      { key: "cuenta", label: "Cuenta", type: "dealLink" },
      { key: "pipeline", label: "Pipeline", type: "pipeline" },
      { key: "etapa", label: "Etapa" },
      { key: "sin_act", label: "Días sin actividad", align: "right" },
      { key: "dias", label: "Días en etapa", align: "right" },
      { key: "ae", label: "AE" },
      { key: "siguiente", label: "Siguiente paso" },
    ],
    rows: atencionRows.map((d) => ({
      deal_id: d.deal_id,
      cuenta: d.cuenta,
      pipeline: d.pipeline,
      etapa: d.etapa,
      sin_act: n(d.dias_sin_actividad),
      dias: n(d.dias_en_etapa),
      ae: aeLabel(d.owner_id, d.ae),
      siguiente: d.siguiente_paso ?? "⚠ sin siguiente paso",
    })),
  };

  const board: BoardCard[] = open.map((d) => ({
    deal_id: d.deal_id,
    cuenta: d.cuenta,
    etapa: d.etapa ?? "Lead Asignado",
    pipeline: d.pipeline,
    mrr: n(d.mrr),
    ae: aeLabel(d.owner_id, d.ae),
    sinActividad: n(d.dias_sin_actividad),
    enEtapa: n(d.dias_en_etapa),
    siguiente: d.siguiente_paso,
  }));
  const VERTS = ["Banca/Fintech", "Retail", "Salud", "Seguros", "BPO", "Sin definir"];
  const porVertical = VERTS.map((v) => {
    const t = open.filter((d) => (d.vertical ?? "Sin definir") === v);
    return { nombre: v, mrr: sumMrr(t), deals: t.length };
  });
  const aeEtapa = Array.from(new Set(open.map((d) => aeLabel(d.owner_id, d.ae)))).map((ae) => {
    const row: Record<string, string | number> = { ae };
    for (const e of STAGE_ORDER) row[e] = open.filter((d) => aeLabel(d.owner_id, d.ae) === ae && d.etapa === e).length;
    return row;
  });

  return {
    periodo: periodoLabel(filters.periodo),
    board,
    porVertical,
    aeEtapa,
    isEmpty: seg.length === 0,
    abierto: {
      deals: open.length,
      mrr: sumMrr(open),
      ponderado: Math.round(open.reduce((s, d) => s + n(d.mrr) * n(d.prob), 0)),
      objetivo: pipe?.pipeline_objetivo ?? null,
      drill: dealsDrill("Pipeline abierto hoy", open),
    },
    ganadosPeriodo: { deals: ganadosPer.length, mrr: sumMrr(ganadosPer), drill: dealsDrill("Ganados en el periodo", ganadosPer) },
    anio: {
      mrr: sumMrr(ganadosAnio),
      metaMrr: pipe?.meta_mrr ?? metaMrr?.meta_valor ?? null,
      logos: ganadosAnio.length,
      metaLogos: metaLogos?.meta_valor ?? null,
      drill: dealsDrill(`Ganados en ${y}`, ganadosAnio),
    },
    porPipeline: PIPELINES.map((p) => {
      const o = open.filter((d) => d.pipeline === p.nombre);
      return {
        nombre: p.nombre,
        color: p.color,
        abiertos: o.length,
        mrr: sumMrr(o),
        ganados: ganadosAnio.filter((d) => d.pipeline === p.nombre).length,
        drill: dealsDrill(`${p.nombre} — pipeline abierto`, o),
      };
    }),
    funnel,
    estado,
    motivos,
    porAe,
    porCanal,
    canalDrill: dealsDrill("Deals por canal de entrada", seg),
    atencion,
  };
}

export async function fetchVentaRaw(): Promise<{ deals: DealRow[]; metas: MetaRow[]; pipe: PipelineObjetivoRow | null }> {
  const [deals, metas, pipe] = await Promise.all([fetchDeals(), fetchMetas(), fetchPipelineObjetivo()]);
  return { deals, metas, pipe };
}
