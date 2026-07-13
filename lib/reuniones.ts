// Construye KPIs/gráficas de la sección REUNIONES a partir de v_reuniones + metas.
// Nota: v_reuniones NO tiene columna de canal todavía, así que "por canal" queda
// sin datos (la página muestra el aviso). "agendado_por" es proxy (quién trajo el lead).

import type { Kpi, ChartSpec, DrillPayload, ReunionRow, MetaRow } from "./types";
import { fetchReuniones, fetchMetas } from "./db";
import { isReunionesTeam, reunionesLabel, REUNIONES_TEAM } from "./team";
import { inPeriodo, matchVertical, matchCarril, type Filters } from "./filters";

// Paleta espectro Sento para series (no-semáforo): real vs meta bien diferenciables.
const C = {
  indigo: "#7C5CFF", // meta (por persona)
  violet: "#2BD98C", // meta (mensual)
  fuchsia: "#7C5CFF", // real (mensual)
  cyan: "#3FA9FF", // real (por persona)
  teal: "#29D3D3", // canal (pie, cells lo sobreescriben)
};
const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const monthLabel = (iso: string | null) => {
  if (!iso) return "Sin fecha";
  const mm = parseInt(iso.slice(5, 7), 10);
  return MESES[mm] ?? iso.slice(0, 7);
};

function reunionesDrill(title: string, rows: ReunionRow[]): DrillPayload {
  return {
    title,
    subtitle: `${rows.length} reunión(es)`,
    columns: [
      { key: "cuenta", label: "Cuenta" },
      { key: "mes", label: "Mes" },
      { key: "agendado_por", label: "Agendó (proxy)" },
      { key: "ae", label: "AE" },
      { key: "es_calificada", label: "Calificada" },
      { key: "etapa", label: "Etapa" },
    ],
    rows: rows.map((r) => ({
      cuenta: r.cuenta,
      mes: r.mes_reunion ? r.mes_reunion.slice(0, 7) : "sin fecha",
      agendado_por: reunionesLabel(r.agendado_por_option_id, r.agendado_por),
      ae: r.ae,
      es_calificada: r.es_calificada ? "sí" : "no",
      etapa: r.etapa,
    })),
  };
}

export type ReunionesData = {
  isEmpty: boolean;
  kpis: Kpi[];
  porPersona: ChartSpec | null;
  porCanal: ChartSpec | null; // null = sin campo canal todavía
  mensual: ChartSpec | null;
  calificacionPendiente: boolean; // true = calificación sin confirmar (graban_llamadas vacío en CRM)
  periodoNota: string | null; // aviso si el periodo excluye reuniones sin fecha
};

export function buildReuniones(reuniones: ReunionRow[], metas: MetaRow[], filters: Filters): ReunionesData {
  // Filtro de equipo por IDENTIFICADOR ESTABLE: solo reuniones traídas por el equipo
  // (agendado_por_option_id ∈ REUNIONES_TEAM). Fuera del equipo → EXCLUIDO, sin romper.
  // + Filtro de PERIODO (global) por fecha_reunion. Se SUMA al filtro de equipo base.
  const teamAll = reuniones.filter((r) => isReunionesTeam(r.agendado_por_option_id));
  const teamReuniones = teamAll
    .filter((r) => inPeriodo(r.fecha_reunion, filters.periodo))
    .filter((r) => matchVertical(r.vertical, filters))
    .filter((r) => matchCarril(r.carril, filters));

  // Nota interpretativa: cuántas agendadas del equipo quedan fuera por no tener fecha_reunion.
  const periodoActivo = filters.periodo.preset !== "todo";
  const sinFecha = teamAll.filter((r) => r.es_agendada && !r.fecha_reunion).length;
  const periodoNota =
    periodoActivo && sinFecha > 0
      ? `Periodo activo: ${sinFecha} reunión(es) agendada(s) sin fecha registrada quedan fuera del conteo.`
      : null;

  const agendadas = teamReuniones.filter((r) => r.es_agendada);
  const realizadas = teamReuniones.filter((r) => r.es_realizada);
  const calificadas = teamReuniones.filter((r) => r.es_calificada);
  const califRealizadas = teamReuniones.filter((r) => r.es_calificada_realizada);

  const showRate = agendadas.length ? realizadas.length / agendadas.length : 0;
  const tasaCalif = agendadas.length ? calificadas.length / agendadas.length : 0;

  // Metas también filtradas por PERIODO (por su 'periodo' mensual) → el headline compara
  // real vs la meta del rango elegido (no siempre el plan completo).
  const metasReu = metas
    .filter((m) => m.tipo_meta === "reuniones")
    .filter((m) => inPeriodo(m.periodo, filters.periodo));
  const metaTotal = metasReu.reduce((s, m) => s + (m.meta_valor ?? 0), 0);

  const kpis: Kpi[] = [
    {
      id: "calif_realizadas",
      label: "Reuniones calificadas realizadas vs meta",
      value: califRealizadas.length,
      meta: metaTotal || null,
      unit: "int",
      hint: "Métrica principal · cumulativo vs plan jul–dic (filtro por mes se cablea después)",
      drill: reunionesDrill("Calificadas realizadas", califRealizadas),
    },
    {
      id: "agendadas",
      label: "Agendadas totales",
      value: agendadas.length,
      unit: "int",
      drill: reunionesDrill("Reuniones agendadas", agendadas),
    },
    {
      id: "realizadas",
      label: "Realizadas",
      value: realizadas.length,
      unit: "int",
      drill: reunionesDrill("Reuniones realizadas", realizadas),
    },
    {
      id: "calif_agendadas",
      label: "Calificadas agendadas",
      value: calificadas.length,
      unit: "int",
      hint: "Agendadas que cumplen la regla de calificación",
      drill: reunionesDrill("Calificadas agendadas", calificadas),
    },
    { id: "show_rate", label: "Show rate", value: showRate, unit: "pct", hint: "Realizadas / Agendadas" },
    {
      id: "tasa_calif",
      label: "Tasa de calificación",
      value: tasaCalif,
      unit: "pct",
      tentativo: true, // depende del UMBRAL de volumen tentativo en v_reuniones
      hint: "Calificadas / Agendadas",
    },
  ];

  // "Pendiente": hay reuniones agendadas pero NINGUNA tiene graban_llamadas confirmado (=true).
  // Con la regla ESTRICTA, calificadas realizadas = 0 por DATO FALTANTE del CRM, no por desempeño.
  // Se marca el KPI principal como pendiente para que el semáforo no salga rojo alarmante.
  const grabanMarcados = teamReuniones.filter((r) => r.graban_llamadas != null).length;
  const calificacionPendiente = califRealizadas.length === 0 && agendadas.length > 0 && grabanMarcados === 0;
  if (calificacionPendiente) {
    kpis[0].pendiente = "Sin confirmar aún (CRM)";
    kpis[0].hint =
      "0 hasta que el equipo marque 'graban llamadas' en Pipedrive. No es bajo desempeño: es dato faltante (calificación estricta).";
  }

  // ---- por persona (por option_id ESTABLE del equipo de reuniones) ----
  // 3 barras por persona: agendadas (actividad), calificadas realizadas (métrica principal
  // de pagos, es_calificada_realizada) y meta del plan.
  const porPersona: ChartSpec | null = REUNIONES_TEAM.length
    ? {
        id: "reu_persona",
        title: "Por persona — calificadas realizadas vs meta (agendadas de referencia)",
        type: "bar",
        xKey: "persona",
        series: [
          { key: "agendadas", label: "Agendadas", color: "#3FA9FF" },
          { key: "realizadas", label: "Calif. realizadas", color: "#1D9E75" },
          { key: "meta", label: "Meta", color: "#7C5CFF" },
        ],
        drill: reunionesDrill("Calificadas realizadas", califRealizadas),
        data: REUNIONES_TEAM.map((m) => ({
          persona: m.nombre,
          agendadas: agendadas.filter((r) => String(r.agendado_por_option_id) === m.optionId).length,
          realizadas: califRealizadas.filter((r) => String(r.agendado_por_option_id) === m.optionId).length,
          meta: m.metaEntidad
            ? metasReu.filter((x) => x.entidad === m.metaEntidad).reduce((s, x) => s + (x.meta_valor ?? 0), 0)
            : 0,
        })),
      }
    : null;

  // ---- por canal: sin datos (v_reuniones no tiene canal aún) ----
  const porCanal: ChartSpec | null = null;

  // ---- vista mensual ----
  const periodos = Array.from(new Set(metasReu.map((m) => m.periodo))).sort();
  const mensual: ChartSpec | null = periodos.length
    ? {
        id: "reu_mensual",
        title: "Vista mensual — calificadas realizadas (real vs meta del equipo)",
        type: "line",
        xKey: "mes",
        series: [
          { key: "real", label: "Calif. realizadas", color: C.fuchsia },
          { key: "meta", label: "Meta equipo", color: C.violet },
        ],
        data: periodos.map((p) => ({
          mes: monthLabel(p),
          real: califRealizadas.filter((r) => r.mes_reunion === p).length,
          meta: metasReu.filter((m) => m.periodo === p).reduce((s, m) => s + (m.meta_valor ?? 0), 0),
        })),
      }
    : null;

  return {
    isEmpty: teamReuniones.length === 0,
    kpis,
    porPersona,
    porCanal,
    mensual,
    calificacionPendiente,
    periodoNota,
  };
}

// Fetch CRUDO (una vez). La página construye la vista con useMemo(build(raw, filters)).
export async function fetchReunionesRaw(): Promise<{ reuniones: ReunionRow[]; metas: MetaRow[] }> {
  const [reuniones, metas] = await Promise.all([fetchReuniones(), fetchMetas()]);
  return { reuniones, metas };
}
