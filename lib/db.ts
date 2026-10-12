// Fetchers de las vistas y tablas reales. Solo lectura. Cada función lanza un Error
// legible si la consulta falla (lo captura el hook useAsync y muestra el estado de error).

import { getSupabase } from "./supabase";
import { pipelineOf } from "./pipeline";
import type {
  DealRow,
  ReunionRow,
  MetaRow,
  PipelineObjetivoRow,
  FunnelRow,
  PipelineActualRow,
  MotivoRow,
} from "./types";

// Filtro robusto a acentos/encoding (igual criterio que las vistas): 'México' / 'Mexico' / mojibake.
const MX = "m%xico";

export async function fetchDeals(): Promise<DealRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("fact_deals")
    .select(
      "deal_id,cuenta,operacion,etapa,mrr,prob,origen,vertical,carril,ae,owner_id,owner_email,dias_sin_actividad,siguiente_paso,dias_en_etapa,winloss_razon,motivo_perdida_option_id,max_stage_id,max_stage,fecha_reunion,fecha_firma,fecha_cierre_est,agendado_por_option_id,canal_entrada,fecha_agendado,updated_at"
    )
    .ilike("operacion", MX);
  if (error) throw new Error(`fact_deals: ${error.message}`);
  // pipeline (Analytics | Voice Agent) se deriva del stage_id: no hay columna en Supabase.
  return ((data ?? []) as Omit<DealRow, "pipeline">[]).map((d) => ({ ...d, pipeline: pipelineOf(d.max_stage_id) }));
}

export async function fetchReuniones(): Promise<ReunionRow[]> {
  const sb = getSupabase();
  // v_reuniones no expone max_stage_id → se une con fact_deals por deal_id para saber el pipeline.
  const [reu, stages] = await Promise.all([
    sb.from("v_reuniones").select("*"),
    sb.from("fact_deals").select("deal_id,max_stage_id").ilike("operacion", MX),
  ]);
  if (reu.error) throw new Error(`v_reuniones: ${reu.error.message}`);
  if (stages.error) throw new Error(`fact_deals: ${stages.error.message}`);
  const stageById = new Map((stages.data ?? []).map((d: any) => [String(d.deal_id), d.max_stage_id as number | null]));
  return ((reu.data ?? []) as Omit<ReunionRow, "pipeline" | "realizada_por">[]).map((r) =>
    realizadaEfectiva({ ...r, pipeline: pipelineOf(stageById.get(String(r.deal_id))), realizada_por: null })
  );
}

// Motivos de pérdida que solo se conocen DESPUÉS de la reunión (la reunión ocurrió):
//   272 = No calificó — volumen insuficiente · 64 = No calificó — no graban / chats no centralizados.
// Ojo: 16 (Sin respuesta / Ghosting) NO prueba que la reunión ocurrió → no cuenta.
const MOTIVOS_POST_REUNION = new Set(["272", "64"]);

/**
 * "Realizada" EFECTIVA. v_reuniones solo marca realizada si el deal llegó a Demo Realizada, pero en la
 * operación hay reuniones que sí ocurrieron y no se movieron de etapa:
 *   - etapa:  llegó a Demo Realizada o más (regla original de la vista).
 *   - motivo: se perdió desde Demo Agendada con un motivo post-reunión (ej. Valenta).
 *   - fecha:  sigue ABIERTO en Demo Agendada y la fecha de reunión ya pasó (ej. Coppel) → cuenta,
 *             pero se marca para que actualicen la etapa en Pipedrive.
 * Calificada realizada = realizada efectiva Y cumple la regla (es_calificada de la vista).
 * Misma lógica en sento-motor/scripts/reporte-comisiones.mjs.
 */
export function realizadaEfectiva(r: ReunionRow, hoy = hoyIso()): ReunionRow {
  if (r.es_realizada) return { ...r, realizada_por: "etapa" };
  if (!r.es_agendada || !r.fecha_reunion) return r;
  const pasada = String(r.fecha_reunion).slice(0, 10) < hoy;
  const por: ReunionRow["realizada_por"] =
    r.etapa === "Perdido" && MOTIVOS_POST_REUNION.has(String(r.motivo_perdida_option_id ?? ""))
      ? "motivo"
      : r.etapa !== "Perdido" && r.etapa !== "Ganado" && pasada
      ? "fecha"
      : null;
  if (!por) return r;
  return { ...r, es_realizada: true, es_calificada_realizada: r.es_calificada, realizada_por: por };
}

function hoyIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Última vez que el Flujo 5 escribió en fact_deals (frescura de los datos de Pipedrive). */
export async function fetchUltimaSync(): Promise<string | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from("fact_deals").select("updated_at").order("updated_at", { ascending: false }).limit(1);
  if (error) return null;
  return (data?.[0] as any)?.updated_at ?? null;
}

export async function fetchMetas(): Promise<MetaRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from("metas").select("*").ilike("operacion", MX);
  if (error) throw new Error(`metas: ${error.message}`);
  return (data ?? []) as MetaRow[];
}

export async function fetchPipelineObjetivo(): Promise<PipelineObjetivoRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from("v_pipeline_objetivo").select("*").limit(1);
  if (error) throw new Error(`v_pipeline_objetivo: ${error.message}`);
  return (data && data.length ? (data[0] as PipelineObjetivoRow) : null);
}

// ---- Vistas de gráficas de Venta ----
export async function fetchFunnelJourney(): Promise<FunnelRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from("v_funnel_journey").select("*").order("rank_etapa");
  if (error) throw new Error(`v_funnel_journey: ${error.message}`);
  return (data ?? []) as FunnelRow[];
}

export async function fetchPipelineActual(): Promise<PipelineActualRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from("v_pipeline_actual").select("*");
  if (error) throw new Error(`v_pipeline_actual: ${error.message}`);
  return (data ?? []) as PipelineActualRow[];
}

export async function fetchPerdidasMotivo(): Promise<MotivoRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from("v_perdidas_motivo").select("*").order("deals", { ascending: false });
  if (error) throw new Error(`v_perdidas_motivo: ${error.message}`);
  return (data ?? []) as MotivoRow[];
}

/**
 * Lectura genérica de cualquier otra vista v_* que exista (para reutilizar más adelante
 * en Prospección u otras secciones). Devuelve filas crudas.
 */
export async function fetchView(view: string): Promise<Record<string, unknown>[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from(view).select("*");
  if (error) throw new Error(`${view}: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}
