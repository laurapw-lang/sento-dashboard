// Fetchers de las vistas y tablas reales. Solo lectura. Cada función lanza un Error
// legible si la consulta falla (lo captura el hook useAsync y muestra el estado de error).

import { getSupabase } from "./supabase";
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
      "deal_id,cuenta,operacion,etapa,mrr,prob,origen,vertical,carril,ae,owner_id,owner_email,dias_sin_actividad,siguiente_paso,dias_en_etapa,winloss_razon,motivo_perdida_option_id,max_stage_id,max_stage,fecha_reunion"
    )
    .ilike("operacion", MX);
  if (error) throw new Error(`fact_deals: ${error.message}`);
  return (data ?? []) as DealRow[];
}

export async function fetchReuniones(): Promise<ReunionRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from("v_reuniones").select("*");
  if (error) throw new Error(`v_reuniones: ${error.message}`);
  return (data ?? []) as ReunionRow[];
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
