// Tipos compartidos del dashboard (mock por ahora; el shape refleja el modelo real).

export type Column = { key: string; label: string; align?: "left" | "right" };

export type DrillPayload = {
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: Record<string, string | number | null>[];
};

export type Kpi = {
  id: string;
  label: string;
  value: number;
  meta?: number | null;      // valor de la meta (si aplica "vs meta")
  unit?: "money" | "int" | "pct";
  tentativo?: boolean;       // meta tentativa -> badge/asterisco
  hint?: string;
  pendiente?: string;        // dato faltante (ej. CRM sin llenar): muestra badge neutral en vez de semáforo rojo
  drill?: DrillPayload;      // detalle al hacer clic
};

// ---- Filas crudas de Supabase (reflejan columnas reales de vistas/tablas) ----

export type DealRow = {
  deal_id: string;
  cuenta: string | null;
  operacion: string | null;
  etapa: string | null;
  mrr: number | null;
  prob: number | null;
  origen: string | null;
  vertical: string | null;
  carril: string | null;
  ae: string | null;
  owner_id: number | null; // user_id.id de Pipedrive (ESTABLE) — filtro de equipo VENTA
  owner_email: string | null;
  dias_sin_actividad: number | null;
  siguiente_paso: string | null;
  dias_en_etapa: number | null;
  winloss_razon: string | null;
  motivo_perdida_option_id: string | null; // option_id ESTABLE del motivo de pérdida
  max_stage_id: number | null; // stage_id de la etapa máxima alcanzada (embudo)
  max_stage: string | null; // nombre de esa etapa
  fecha_reunion: string | null;
  fecha_firma: string | null; // cierre real (ganados)
  fecha_cierre_est: string | null; // cierre estimado (abiertos)
  agendado_por_option_id: string | null; // quién trajo el lead (option_id ESTABLE) — filtro Origen
};

// Filas de las vistas de gráficas de Venta
export type FunnelRow = { rank_etapa: number; etapa: string; alcanzaron: number };
export type PipelineActualRow = { etapa: string; deals: number; mrr: number };
export type MotivoRow = { motivo_id: string | null; motivo: string; deals: number };

export type ReunionRow = {
  deal_id: string;
  cuenta: string | null;
  mes_reunion: string | null; // 'YYYY-MM-DD' (primer día del mes) o null
  fecha_reunion: string | null;
  agendado_por: string | null; // label (etiqueta)
  agendado_por_option_id: string | null; // option_id ESTABLE — filtro de equipo REUNIONES
  ae: string | null;
  vertical: string | null;
  carril: string | null;
  etapa: string | null;
  es_agendada: boolean | null;
  es_realizada: boolean | null;
  es_calificada: boolean | null;
  es_calificada_realizada: boolean | null;
  graban_llamadas: boolean | null;
  horas_mes: number | null;
  chats_mes: number | null;
  discovery: string | null;
};

export type MetaRow = {
  operacion: string | null;
  entidad: string | null;
  rol: string | null;
  periodo: string; // 'YYYY-MM-DD' ISO text
  tipo_meta: string; // 'reuniones' | 'mrr' | 'logos'
  meta_valor: number | null;
  win_rate_sup: number | null;
  tentativo: boolean | null;
};

export type PipelineObjetivoRow = {
  meta_mrr: number | null;
  win_rate_sup: number | null;
  pipeline_objetivo: number | null;
  pipeline_actual: number | null;
  brecha: number | null;
};

export type ChartType = "bar" | "funnel" | "pie" | "line";

export type ChartSpec = {
  id: string;
  title: string;
  type: ChartType;
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; label: string; color: string }[];
  tentativo?: boolean;
  drill?: DrillPayload;
};
