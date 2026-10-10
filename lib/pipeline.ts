// PIPELINES de venta en Pipedrive (Operación México). Fuente: sento-motor/docs/pipedrive-config.md.
// Son espejos: mismos nombres de etapa, stage IDs DISTINTOS. Por eso el pipeline de un deal se
// deriva de su stage_id (fact_deals.max_stage_id) sin necesitar una columna extra en Supabase.
//
// ⚠️ Si se crea otro pipeline de venta, agregarlo aquí (y su STAGE_MAP en el Flujo 5).

export type PipelineName = "Analytics" | "Voice Agent";

export const PIPELINES: { id: number; nombre: PipelineName; corto: string; color: string; soft: string }[] = [
  { id: 4, nombre: "Analytics", corto: "Analytics", color: "#3FA9FF", soft: "rgba(63,169,255,0.12)" },
  { id: 8, nombre: "Voice Agent", corto: "Voice", color: "#7C5CFF", soft: "rgba(124,92,255,0.12)" },
];

// stage_id -> [pipeline, rank de la etapa en el embudo (1..8)]
const STAGES: Record<number, [PipelineName, number]> = {
  // Analytics (pipeline 4)
  20: ["Analytics", 1], 21: ["Analytics", 2], 22: ["Analytics", 3], 23: ["Analytics", 4],
  24: ["Analytics", 5], 29: ["Analytics", 6], 28: ["Analytics", 7], 27: ["Analytics", 8],
  // Voice Agent (pipeline 8)
  58: ["Voice Agent", 1], 59: ["Voice Agent", 2], 60: ["Voice Agent", 3], 61: ["Voice Agent", 4],
  62: ["Voice Agent", 5], 64: ["Voice Agent", 6], 65: ["Voice Agent", 7], 66: ["Voice Agent", 8],
};

/** Pipeline del deal según su stage_id. Desconocido / null → Analytics (el pipeline principal). */
export function pipelineOf(stageId: number | null | undefined): PipelineName {
  if (stageId == null) return "Analytics";
  return STAGES[Number(stageId)]?.[0] ?? "Analytics";
}

/** Rank de la etapa (1 = Lead asignado … 8 = Contrato final) en cualquiera de los dos pipelines. */
export function stageRank(stageId: number | null | undefined): number | null {
  if (stageId == null) return null;
  return STAGES[Number(stageId)]?.[1] ?? null;
}

export function pipelineMeta(nombre: string | null | undefined) {
  return PIPELINES.find((p) => p.nombre === nombre) ?? PIPELINES[0];
}

export const PIPELINE_OPTIONS = ["Todos", ...PIPELINES.map((p) => p.nombre)];

// Colores fijos por vertical (mismos en todas las gráficas).
export const VERT_COLORS: Record<string, string> = {
  "Banca/Fintech": "#3FA9FF",
  Retail: "#29D3D3",
  Salud: "#2BD98C",
  Seguros: "#7C5CFF",
  BPO: "#EF9F27",
  "Sin definir": "#C6CEDA",
};
