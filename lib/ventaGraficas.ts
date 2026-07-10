// Construye las 3 gráficas nuevas de Venta (embudo journey, pipeline actual, motivos)
// a partir de las vistas (v_funnel_journey, v_pipeline_actual, v_perdidas_motivo) y de
// fact_deals (para el drill-down a nivel deal). Filtro de equipo AE por owner_id.

import type { DealRow, DrillPayload } from "./types";
import { fetchFunnelJourney, fetchPipelineActual, fetchPerdidasMotivo, fetchDeals } from "./db";
import { isAeVenta, aeLabel } from "./team";

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

export async function loadVentaGraficas(): Promise<VentaGraficas> {
  const [funnelRows, pipeRows, motivoRows, deals] = await Promise.all([
    fetchFunnelJourney(),
    fetchPipelineActual(),
    fetchPerdidasMotivo(),
    fetchDeals(),
  ]);
  const team = deals.filter((d) => isAeVenta(d.owner_id));

  const funnel: FunnelStage[] = funnelRows.map((r, i) => {
    const prev = i > 0 ? funnelRows[i - 1].alcanzaron : null;
    const conv = i === 0 ? 1 : prev && prev > 0 ? r.alcanzaron / prev : null;
    return {
      rank: r.rank_etapa,
      etapa: r.etapa,
      alcanzaron: r.alcanzaron,
      conv,
      drill: dealsDrill(`Alcanzaron “${r.etapa}” o más`, team.filter((d) => effRank(d) >= r.rank_etapa)),
    };
  });

  const pipeline: PipelineBar[] = pipeRows.map((r) => ({
    etapa: r.etapa,
    deals: r.deals,
    mrr: r.mrr,
    cat: r.etapa === "Ganado" ? "ganado" : r.etapa === "Perdido" ? "perdido" : "activo",
    drill: dealsDrill(`Deals en “${r.etapa}”`, team.filter((d) => d.etapa === r.etapa)),
  }));

  const motivos: MotivoBar[] = motivoRows.map((r) => ({
    motivo: r.motivo,
    deals: r.deals,
    drill: dealsDrill(`Perdidos: ${r.motivo}`, team.filter((d) => d.etapa === "Perdido" && dealMotivo(d) === r.motivo)),
  }));

  return { isEmpty: team.length === 0, funnel, pipeline, motivos };
}
