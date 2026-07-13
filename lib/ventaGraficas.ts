// Construye las 3 gráficas nuevas de Venta (embudo journey, pipeline actual, motivos)
// a partir de las vistas (v_funnel_journey, v_pipeline_actual, v_perdidas_motivo) y de
// fact_deals (para el drill-down a nivel deal). Filtro de equipo AE por owner_id.

import type { DealRow, DrillPayload, FunnelRow, PipelineActualRow, MotivoRow } from "./types";
import { fetchFunnelJourney, fetchPipelineActual, fetchPerdidasMotivo, fetchDeals } from "./db";
import { isAeVenta, aeLabel } from "./team";
import { inPeriodo, matchVertical, matchCarril, matchAE, type Filters } from "./filters";

const cierre = (d: DealRow) => d.fecha_firma ?? d.fecha_cierre_est;

// rank del stage_id (mismo orden del embudo). 'Ganado' es status -> rank 9.
const STAGE_RANK: Record<number, number> = { 20: 1, 21: 2, 22: 3, 23: 4, 24: 5, 29: 6, 28: 7, 27: 8 };
function effRank(d: DealRow): number {
  if (d.etapa === "Ganado") return 9;
  return d.max_stage_id != null && STAGE_RANK[d.max_stage_id] != null ? STAGE_RANK[d.max_stage_id] : 0;
}

// Mismo mapa de labels que v_perdidas_motivo (para reconstruir el motivo por deal en el drill).
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
function dealMotivo(d: DealRow): string {
  if (d.motivo_perdida_option_id && MOTIVO_LABELS[d.motivo_perdida_option_id]) return MOTIVO_LABELS[d.motivo_perdida_option_id];
  return d.winloss_razon || "Sin motivo";
}

function dealsDrill(title: string, rows: DealRow[]): DrillPayload {
  return {
    title,
    subtitle: `${rows.length} deal(s)`,
    columns: [
      { key: "deal_id", label: "Deal" },
      { key: "cuenta", label: "Cuenta" },
      { key: "etapa", label: "Etapa actual" },
      { key: "max_stage", label: "Etapa máx." },
      { key: "mrr", label: "MRR", align: "right" },
      { key: "ae", label: "AE" },
    ],
    rows: rows.map((d) => ({
      deal_id: d.deal_id,
      cuenta: d.cuenta,
      etapa: d.etapa,
      max_stage: d.max_stage,
      mrr: d.mrr ?? 0,
      ae: aeLabel(d.owner_id, d.ae),
    })),
  };
}

export type FunnelStage = { rank: number; etapa: string; alcanzaron: number; conv: number | null; drill: DrillPayload };
export type PipelineBar = { etapa: string; deals: number; mrr: number; cat: "activo" | "ganado" | "perdido"; drill: DrillPayload };
export type MotivoBar = { motivo: string; deals: number; drill: DrillPayload };
export type VentaGraficas = { isEmpty: boolean; funnel: FunnelStage[]; pipeline: PipelineBar[]; motivos: MotivoBar[] };

// Fetch CRUDO (una vez). Las vistas se usan solo para la ESTRUCTURA (orden de etapas,
// lista de motivos); los CONTEOS se recalculan desde los deals filtrados.
export async function fetchVentaGraficasRaw(): Promise<{
  funnelRows: FunnelRow[];
  pipeRows: PipelineActualRow[];
  motivoRows: MotivoRow[];
  deals: DealRow[];
}> {
  const [funnelRows, pipeRows, motivoRows, deals] = await Promise.all([
    fetchFunnelJourney(),
    fetchPipelineActual(),
    fetchPerdidasMotivo(),
    fetchDeals(),
  ]);
  return { funnelRows, pipeRows, motivoRows, deals };
}

export function buildVentaGraficas(
  raw: { funnelRows: FunnelRow[]; pipeRows: PipelineActualRow[]; motivoRows: MotivoRow[]; deals: DealRow[] },
  filters: Filters
): VentaGraficas {
  const { funnelRows, pipeRows, motivoRows, deals } = raw;
  // Equipo AE + PERIODO (por fecha de cierre) → conteos coherentes con el filtro global.
  const team = deals
    .filter((d) => isAeVenta(d.owner_id))
    .filter((d) => inPeriodo(cierre(d), filters.periodo))
    .filter((d) => matchVertical(d.vertical, filters))
    .filter((d) => matchCarril(d.carril, filters))
    .filter((d) => matchAE(aeLabel(d.owner_id, d.ae), filters));

  // Embudo (recorrido): alcanzaron[i] = deals con effRank >= rank de la etapa i (recalculado).
  const alcanzaron = funnelRows.map((r) => team.filter((d) => effRank(d) >= r.rank_etapa).length);
  const funnel: FunnelStage[] = funnelRows.map((r, i) => ({
    rank: r.rank_etapa,
    etapa: r.etapa,
    alcanzaron: alcanzaron[i],
    conv: i === 0 ? 1 : alcanzaron[i - 1] > 0 ? alcanzaron[i] / alcanzaron[i - 1] : null,
    drill: dealsDrill(`Alcanzaron “${r.etapa}” o más`, team.filter((d) => effRank(d) >= r.rank_etapa)),
  }));

  // Pipeline por etapa (conteo + MRR desde deals filtrados). Oculta etapas sin deals.
  const pipeline: PipelineBar[] = pipeRows
    .map((r) => {
      const t = team.filter((d) => d.etapa === r.etapa);
      return {
        etapa: r.etapa,
        deals: t.length,
        mrr: t.reduce((s, d) => s + (d.mrr ?? 0), 0),
        cat: (r.etapa === "Ganado" ? "ganado" : r.etapa === "Perdido" ? "perdido" : "activo") as PipelineBar["cat"],
        drill: dealsDrill(`Deals en “${r.etapa}”`, t),
      };
    })
    .filter((r) => r.deals > 0);

  // Motivos de pérdida (desde perdidos filtrados). Oculta motivos sin deals.
  const motivos: MotivoBar[] = motivoRows
    .map((r) => {
      const t = team.filter((d) => d.etapa === "Perdido" && dealMotivo(d) === r.motivo);
      return { motivo: r.motivo, deals: t.length, drill: dealsDrill(`Perdidos: ${r.motivo}`, t) };
    })
    .filter((r) => r.deals > 0);

  return { isEmpty: team.length === 0, funnel, pipeline, motivos };
}
