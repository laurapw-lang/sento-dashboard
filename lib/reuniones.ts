// Construye KPIs/gráficas de la sección REUNIONES a partir de v_reuniones + metas.
// Nota: v_reuniones NO tiene columna de canal todavía, así que "por canal" queda
// sin datos (la página muestra el aviso). "agendado_por" es proxy (quién trajo el lead).

import type { Kpi, ChartSpec, DrillPayload, ReunionRow, MetaRow } from "./types";
import { fetchReuniones, fetchMetas } from "./db";
import { isReunionesTeam, reunionesLabel, REUNIONES_TEAM, matchOrigen, metaEntidadForOrigen } from "./team";
import { inPeriodo, matchVertical, matchCarril, matchAE, type Filters } from "./filters";

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

// Formato de fecha para los drill-downs: YYYY-MM-DD (año-mes-día). null/vacío → "—".
// Las columnas date de Postgres llegan ya como "YYYY-MM-DD"; se recorta por si trae hora.
const fmtFecha = (v: string | null): string => (v ? String(v).slice(0, 10) : "—");

// Tooltip de limitación de fecha_agendado (deriva de stage_change_time): exacta solo para
// deals ahora en Demo Agendada; aproximada (último cambio de etapa) para los que ya avanzaron.
const HINT_AGENDADO =
  "Aproximado: es la fecha del último cambio de etapa (stage_change_time). Exacta solo para deals que siguen en Demo Agendada.";

function reunionesDrill(title: string, rows: ReunionRow[]): DrillPayload {
  return {
    title,
    subtitle: `${rows.length} reunión(es)`,
    columns: [
      { key: "cuenta", label: "Cuenta", type: "dealLink" },
      { key: "fecha_agendado", label: "Fecha agendado", hint: HINT_AGENDADO },
      { key: "fecha_reunion", label: "Fecha reunión" },
      { key: "agendado_por", label: "Agendó (proxy)" },
      { key: "ae", label: "AE" },
      { key: "es_calificada", label: "Calificada" },
      { key: "etapa", label: "Etapa" },
    ],
    rows: rows.map((r) => ({
      deal_id: r.deal_id,
      cuenta: r.cuenta,
      fecha_agendado: fmtFecha(r.fecha_agendado),
      fecha_reunion: fmtFecha(r.fecha_reunion),
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
  proximasCount: number; // reuniones agendadas para DESPUÉS de hoy (futuras con fecha)
  proximas: DrillPayload; // listado de próximas (cuenta clickeable, fecha, AE, setter), asc por fecha
};

export function buildReuniones(reuniones: ReunionRow[], metas: MetaRow[], filters: Filters): ReunionesData {
  // Filtro de equipo por IDENTIFICADOR ESTABLE: solo reuniones traídas por el equipo
  // (agendado_por_option_id ∈ REUNIONES_TEAM). Fuera del equipo → EXCLUIDO, sin romper.
  const teamAll = reuniones.filter((r) => isReunionesTeam(r.agendado_por_option_id));

  // Filtros de SEGMENTO (vertical/carril/AE/Origen) aplican por igual a todas las métricas.
  const teamSeg = teamAll
    .filter((r) => matchVertical(r.vertical, filters))
    .filter((r) => matchCarril(r.carril, filters))
    .filter((r) => matchAE(r.ae, filters)) // AE = owner del deal (v_reuniones.ae)
    .filter((r) => matchOrigen(r.agendado_por_option_id, filters.origen)); // Origen = setter

  // El MISMO preset de período se aplica a DOS fechas distintas según la métrica:
  //   · AGENDADAS  → por fecha_agendado (cuándo se agendó la reunión)
  //   · REALIZADAS → por fecha_reunion  (cuándo ocurrió la reunión)
  // Así "este mes" muestra en Agendadas las agendadas este mes, y en Realizadas las
  // realizadas este mes: un mismo filtro moviendo fechas distintas.
  const porAgendado = teamSeg.filter((r) => inPeriodo(r.fecha_agendado, filters.periodo));
  const porReunion = teamSeg.filter((r) => inPeriodo(r.fecha_reunion, filters.periodo));

  // Nota interpretativa: cuántas agendadas del equipo quedan fuera por no tener fecha_agendado
  // (la fecha por la que ahora se filtran las agendadas).
  const periodoActivo = filters.periodo.preset !== "todo";
  const sinFecha = teamSeg.filter((r) => r.es_agendada && !r.fecha_agendado).length;
  const periodoNota =
    periodoActivo && sinFecha > 0
      ? `Periodo activo: ${sinFecha} reunión(es) agendada(s) sin fecha de agendado registrada quedan fuera del conteo.`
      : null;

  // Agendadas y sus calificadas → cohorte por fecha_agendado.
  const agendadas = porAgendado.filter((r) => r.es_agendada);
  const calificadas = porAgendado.filter((r) => r.es_calificada);
  // Realizadas y calificadas realizadas → cohorte por fecha_reunion.
  const realizadas = porReunion.filter((r) => r.es_realizada);
  const califRealizadas = porReunion.filter((r) => r.es_calificada_realizada);

  const showRate = agendadas.length ? realizadas.length / agendadas.length : 0;
  const tasaCalif = agendadas.length ? calificadas.length / agendadas.length : 0;

  // Metas filtradas por PERIODO (por su 'periodo' mensual) Y por PERSONA (Origen = setter).
  // Las metas de reuniones son metas de "quién agendó", así que la meta del headline sigue
  // el filtro ORIGEN para comparar manzanas con manzanas:
  //   Origen = persona → SU meta del período · Origen = Todos → suma del equipo.
  // El filtro AE (owner del deal) NO ajusta la meta: es otra dimensión sin meta propia.
  const metasReu = metas
    .filter((m) => m.tipo_meta === "reuniones")
    .filter((m) => inPeriodo(m.periodo, filters.periodo));
  const origenSel = filters.origen;
  const origenTodos = !origenSel || origenSel === "Todos";
  const metaEntidadSel = origenTodos ? null : metaEntidadForOrigen(origenSel);
  // Origen con persona pero sin meta (Otro / Andrés) → [] → sin meta comparable.
  const metasReuFiltradas = origenTodos
    ? metasReu
    : metaEntidadSel
    ? metasReu.filter((m) => m.entidad === metaEntidadSel)
    : [];
  const metaTotal = metasReuFiltradas.reduce((s, m) => s + (m.meta_valor ?? 0), 0);
  const metaAmbito = origenTodos
    ? "equipo completo"
    : metaEntidadSel ?? `${origenSel} — sin meta definida`;

  // Meta de AGENDADAS (tipo_meta='reuniones_agendadas'), MISMA regla Periodo + Origen que
  // realizadas: Origen=Todos → suma equipo · Origen=persona con meta → su meta · sin meta → 0.
  const metasAgeReu = metas
    .filter((m) => m.tipo_meta === "reuniones_agendadas")
    .filter((m) => inPeriodo(m.periodo, filters.periodo));
  const metaAgendadasTotal = (
    origenTodos ? metasAgeReu : metaEntidadSel ? metasAgeReu.filter((m) => m.entidad === metaEntidadSel) : []
  ).reduce((s, m) => s + (m.meta_valor ?? 0), 0);

  const kpis: Kpi[] = [
    {
      id: "calif_realizadas",
      label: "Reuniones calificadas realizadas vs meta",
      value: califRealizadas.length,
      meta: metaTotal || null,
      unit: "int",
      hint: `Métrica principal · meta = ${metaAmbito}, ajustada al período y al filtro de persona (Origen).`,
      drill: reunionesDrill("Calificadas realizadas", califRealizadas),
    },
    {
      id: "agendadas",
      label: "Agendadas vs meta",
      value: agendadas.length,
      meta: metaAgendadasTotal || null,
      unit: "int",
      hint: `Reuniones agendadas · meta = ${metaAmbito}, ajustada al período y al filtro de persona (Origen).`,
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
  const grabanMarcados = porReunion.filter((r) => r.graban_llamadas != null).length;
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

  // ---- Reuniones PRÓXIMAS: agendadas para DESPUÉS de hoy (fecha_reunion > hoy) ----
  // Reactivas a los filtros de SEGMENTO (vertical/carril/AE/Origen), NO al filtro de Periodo:
  // "próximas" define su propia ventana temporal (el futuro), así que el preset de período
  // (este mes / mes pasado) no aplica aquí. Orden ascendente = la más próxima primero.
  const hd = new Date();
  const hoy = `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, "0")}-${String(hd.getDate()).padStart(2, "0")}`;
  const proximasRows = teamAll
    .filter((r) => r.fecha_reunion && String(r.fecha_reunion).slice(0, 10) > hoy)
    .filter((r) => matchVertical(r.vertical, filters))
    .filter((r) => matchCarril(r.carril, filters))
    .filter((r) => matchAE(r.ae, filters))
    .filter((r) => matchOrigen(r.agendado_por_option_id, filters.origen))
    .sort((a, b) => String(a.fecha_reunion).localeCompare(String(b.fecha_reunion)));
  const proximas: DrillPayload = {
    title: "Reuniones próximas",
    subtitle: `${proximasRows.length} próxima(s) · después de ${hoy}`,
    columns: [
      { key: "cuenta", label: "Cuenta", type: "dealLink" },
      { key: "fecha_agendado", label: "Fecha agendado", hint: HINT_AGENDADO },
      { key: "fecha", label: "Fecha reunión" },
      { key: "ae", label: "AE" },
      { key: "setter", label: "Agendó" },
      { key: "etapa", label: "Etapa" },
    ],
    rows: proximasRows.map((r) => ({
      deal_id: r.deal_id,
      cuenta: r.cuenta,
      fecha_agendado: fmtFecha(r.fecha_agendado),
      fecha: fmtFecha(r.fecha_reunion),
      ae: r.ae,
      setter: reunionesLabel(r.agendado_por_option_id, r.agendado_por),
      etapa: r.etapa,
    })),
  };

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
          { key: "meta", label: origenTodos ? "Meta equipo" : `Meta ${metaAmbito}`, color: C.violet },
        ],
        data: periodos.map((p) => ({
          mes: monthLabel(p),
          real: califRealizadas.filter((r) => r.mes_reunion === p).length,
          meta: metasReuFiltradas.filter((m) => m.periodo === p).reduce((s, m) => s + (m.meta_valor ?? 0), 0),
        })),
      }
    : null;

  return {
    isEmpty: porAgendado.length === 0 && porReunion.length === 0,
    kpis,
    porPersona,
    porCanal,
    mensual,
    calificacionPendiente,
    periodoNota,
    proximasCount: proximasRows.length,
    proximas,
  };
}

// Fetch CRUDO (una vez). La página construye la vista con useMemo(build(raw, filters)).
export async function fetchReunionesRaw(): Promise<{ reuniones: ReunionRow[]; metas: MetaRow[] }> {
  const [reuniones, metas] = await Promise.all([fetchReuniones(), fetchMetas()]);
  return { reuniones, metas };
}
