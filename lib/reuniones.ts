// Construye la sección REUNIONES a partir de v_reuniones (+ pipeline derivado) y metas.
//
// Lenguaje de la operación (lo que se paga y se mide):
//   AGENDADAS              → el deal llegó a Demo Agendada o más · cohorte por fecha_agendado
//   REALIZADAS             → llegó a Demo Realizada o más        · cohorte por fecha_reunion
//   CALIFICADAS REALIZADAS → realizada Y cumple la regla (graban llamadas + volumen) — LA MÉTRICA
//                            DE COMISIONES (misma lógica que scripts/reporte-comisiones.mjs)
// "agendado_por" = "Quién trajo el lead" (proxy del setter).

import type { DrillPayload, ReunionRow, MetaRow } from "./types";
import { fetchReuniones, fetchMetas } from "./db";
import { isReunionesTeam, reunionesLabel, REUNIONES_TEAM, META_ENTIDADES_EQUIPO, matchOrigen, metaEntidadForOrigen } from "./team";
import { inPeriodo, matchVertical, matchCarril, matchAE, matchPipeline, periodoLabel, type Filters } from "./filters";
import { PIPELINES, type PipelineName } from "./pipeline";
import type { AgendaItem } from "@/components/viz";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const fmtFecha = (v: string | null): string => (v ? String(v).slice(0, 10) : "—");
const siNo = (v: boolean | null) => (v === true ? "sí" : v === false ? "no" : "pendiente");

const HINT_AGENDADO = "Fecha de creación del deal en Pipedrive (hora MX). Nunca posterior a la reunión.";
const HINT_CALIF = "Graba llamadas = Sí y no se perdió por volumen insuficiente. 'pendiente' = falta el dato en Pipedrive.";

function reunionesDrill(title: string, rows: ReunionRow[], subtitle?: string): DrillPayload {
  return {
    title,
    subtitle: subtitle ?? `${rows.length} reunión(es)`,
    columns: [
      { key: "cuenta", label: "Cuenta", type: "dealLink" },
      { key: "pipeline", label: "Pipeline", type: "pipeline" },
      { key: "fecha_agendado", label: "Agendada", hint: HINT_AGENDADO },
      { key: "fecha_reunion", label: "Reunión" },
      { key: "agendado_por", label: "Quién agendó" },
      { key: "ae", label: "AE" },
      { key: "calificada", label: "Califica", type: "si_no", hint: HINT_CALIF },
      { key: "etapa", label: "Etapa hoy" },
    ],
    rows: [...rows]
      .sort((a, b) => String(b.fecha_reunion ?? "").localeCompare(String(a.fecha_reunion ?? "")))
      .map((r) => ({
        deal_id: r.deal_id,
        cuenta: r.cuenta,
        pipeline: r.pipeline,
        fecha_agendado: fmtFecha(r.fecha_agendado),
        fecha_reunion: fmtFecha(r.fecha_reunion),
        agendado_por: reunionesLabel(r.agendado_por_option_id, r.agendado_por),
        ae: r.ae,
        calificada: r.es_realizada ? siNo(r.es_calificada_realizada) : siNo(r.es_calificada),
        etapa: r.etapa,
      })),
  };
}

export type Bloque = { valor: number; drill: DrillPayload };
export type PersonaFila = {
  nombre: string;
  agendadas: number;
  realizadas: number;
  calif: number;
  noCalif: number; // realizadas que NO califican (se miden aparte)
  meta: number | null;
  drill: DrillPayload;
};
export type PipelineFila = { nombre: PipelineName; color: string; agendadas: number; realizadas: number; calif: number; drill: DrillPayload };
export type MesFila = { mes: string; key: string; Analytics: number; "Voice Agent": number; "No califican": number; meta: number | null };
export type RazonNoCalif = { razon: string; n: number; recuperable: boolean; drill: DrillPayload };

export type ReunionesData = {
  periodo: string;
  metaAplica: boolean; // false cuando se filtra por un solo pipeline (las metas son totales)
  metaAmbito: string;
  calif: Bloque & { meta: number | null; metaAgendadas: number | null };
  agendadas: Bloque;
  realizadas: Bloque;
  // Realizadas que NO califican: no cuentan para comisión pero SÍ son reuniones hechas → se miden aparte.
  noCalif: Bloque & { razones: RazonNoCalif[] };
  showRate: number | null; // realizadas / agendadas
  tasaCalif: number | null; // calificadas realizadas / realizadas
  porPipeline: PipelineFila[];
  equipo: PersonaFila[];
  proximas: DrillPayload;
  porRevisar: DrillPayload; // realizadas sin el dato de calificación en Pipedrive
  tendencia: MesFila[];
  porVertical: { nombre: string; realizadas: number; calif: number }[];
  agenda: AgendaItem[];
  ritmo: number | null; // fracción del mes transcurrida (solo "este mes")
  isEmpty: boolean;
};

export function buildReuniones(reuniones: ReunionRow[], metas: MetaRow[], filters: Filters): ReunionesData {
  // Equipo por IDENTIFICADOR ESTABLE + filtros de segmento (aplican a todo).
  const teamAll = reuniones.filter((r) => isReunionesTeam(r.agendado_por_option_id));
  const seg = teamAll
    .filter((r) => matchVertical(r.vertical, filters))
    .filter((r) => matchCarril(r.carril, filters))
    .filter((r) => matchAE(r.ae, filters))
    .filter((r) => matchOrigen(r.agendado_por_option_id, filters.origen))
    .filter((r) => matchPipeline(r.pipeline, filters));

  // Mismo periodo, dos fechas: agendadas por fecha_agendado, realizadas por fecha_reunion.
  const agendadas = seg.filter((r) => r.es_agendada && inPeriodo(r.fecha_agendado, filters.periodo));
  const realizadas = seg.filter((r) => r.es_realizada && inPeriodo(r.fecha_reunion, filters.periodo));
  const califReal = realizadas.filter((r) => r.es_calificada_realizada === true);
  const noCalifRows = realizadas.filter((r) => r.es_calificada_realizada !== true);
  // Por qué no califica (en el orden de la regla de v_reuniones).
  const razonDe = (r: ReunionRow): { razon: string; recuperable: boolean } =>
    r.graban_llamadas == null
      ? { razon: "Falta capturar “Graban llamadas”", recuperable: true }
      : r.graban_llamadas === false
      ? { razon: "No graban llamadas", recuperable: false }
      : r.es_calificada_realizada == null
      ? { razon: "Falta el motivo de pérdida", recuperable: true }
      : { razon: "Perdido por volumen insuficiente (<150 h/mes)", recuperable: false };
  const razonesMap = new Map<string, { recuperable: boolean; rows: ReunionRow[] }>();
  for (const r of noCalifRows) {
    const { razon, recuperable } = razonDe(r);
    const cur = razonesMap.get(razon) ?? { recuperable, rows: [] };
    cur.rows.push(r);
    razonesMap.set(razon, cur);
  }
  const razones: RazonNoCalif[] = Array.from(razonesMap.entries())
    .map(([razon, v]) => ({ razon, n: v.rows.length, recuperable: v.recuperable, drill: reunionesDrill(`No califican: ${razon}`, v.rows) }))
    .sort((a, b) => b.n - a.n);

  // ---- Metas (de setter, mensuales): siguen Periodo + Quién agendó. No se dividen por pipeline.
  const metaAplica = filters.pipeline === "Todos";
  const origenTodos = !filters.origen || filters.origen === "Todos";
  const metaEntidadSel = origenTodos ? null : metaEntidadForOrigen(filters.origen);
  // Solo metas de personas del equipo ACTUAL (las de quienes ya salieron no suman).
  metas = metas.filter((m) => m.tipo_meta === "mrr" || m.tipo_meta === "logos" || META_ENTIDADES_EQUIPO.has(m.entidad ?? ""));
  const metasDe = (tipo: string) => {
    const base = metas.filter((m) => m.tipo_meta === tipo).filter((m) => inPeriodo(m.periodo, filters.periodo));
    return origenTodos ? base : metaEntidadSel ? base.filter((m) => m.entidad === metaEntidadSel) : [];
  };
  const suma = (ms: MetaRow[]) => ms.reduce((s, m) => s + (m.meta_valor ?? 0), 0);
  const metaCalif = suma(metasDe("reuniones")) || null;
  const metaAgendadas = suma(metasDe("reuniones_agendadas")) || null;
  const metaAmbito = origenTodos ? "meta del equipo" : metaEntidadSel ? `meta de ${filters.origen}` : `${filters.origen} no tiene meta`;

  // ---- Por pipeline (Analytics vs Voice Agent) ----
  const porPipeline: PipelineFila[] = PIPELINES.map((p) => {
    const a = agendadas.filter((r) => r.pipeline === p.nombre);
    const re = realizadas.filter((r) => r.pipeline === p.nombre);
    const c = califReal.filter((r) => r.pipeline === p.nombre);
    return {
      nombre: p.nombre,
      color: p.color,
      agendadas: a.length,
      realizadas: re.length,
      calif: c.length,
      drill: reunionesDrill(`${p.nombre} — reuniones realizadas`, re),
    };
  });

  // ---- Por persona (setter) ----
  const metasReuPeriodo = metas.filter((m) => m.tipo_meta === "reuniones").filter((m) => inPeriodo(m.periodo, filters.periodo));
  const equipo: PersonaFila[] = REUNIONES_TEAM.filter((m) => origenTodos || m.nombre === filters.origen)
    .map((m) => {
      const mine = (rows: ReunionRow[]) => rows.filter((r) => String(r.agendado_por_option_id) === m.optionId);
      const meta = m.metaEntidad ? suma(metasReuPeriodo.filter((x) => x.entidad === m.metaEntidad)) : 0;
      return {
        nombre: m.nombre,
        agendadas: mine(agendadas).length,
        realizadas: mine(realizadas).length,
        calif: mine(califReal).length,
        noCalif: mine(noCalifRows).length,
        meta: metaAplica && meta > 0 ? meta : null,
        drill: reunionesDrill(`${m.nombre} — calificadas realizadas`, mine(califReal)),
      };
    })
    .sort((a, b) => b.calif - a.calif || b.realizadas - a.realizadas);

  // ---- Próximas (futuras): ignoran el Periodo, respetan el segmento ----
  const hd = new Date();
  const hoy = `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, "0")}-${String(hd.getDate()).padStart(2, "0")}`;
  const proxRows = seg
    .filter((r) => r.fecha_reunion && String(r.fecha_reunion).slice(0, 10) >= hoy)
    .sort((a, b) => String(a.fecha_reunion).localeCompare(String(b.fecha_reunion)));
  const proximas: DrillPayload = {
    title: "Reuniones próximas",
    subtitle: `${proxRows.length} desde hoy (${hoy})`,
    columns: [
      { key: "fecha", label: "Reunión" },
      { key: "cuenta", label: "Cuenta", type: "dealLink" },
      { key: "pipeline", label: "Pipeline", type: "pipeline" },
      { key: "setter", label: "Quién agendó" },
      { key: "ae", label: "AE" },
      { key: "graba", label: "Graba llamadas", type: "si_no" },
    ],
    rows: proxRows.map((r) => ({
      deal_id: r.deal_id,
      fecha: (fmtFecha(r.fecha_reunion) === hoy ? "HOY · " : "") + fmtFecha(r.fecha_reunion),
      cuenta: r.cuenta,
      pipeline: r.pipeline,
      setter: reunionesLabel(r.agendado_por_option_id, r.agendado_por),
      ae: r.ae,
      graba: siNo(r.graban_llamadas),
    })),
  };

  // ---- Por revisar: realizadas del periodo cuya calificación no se puede evaluar (falta dato) ----
  const pendientes = realizadas.filter((r) => r.es_calificada_realizada == null || r.graban_llamadas == null);
  const porRevisar: DrillPayload = {
    title: "Reuniones realizadas con dato faltante en Pipedrive",
    subtitle: "Si al capturar el dato califican, suben las calificadas (y la comisión).",
    columns: [
      { key: "cuenta", label: "Cuenta", type: "dealLink" },
      { key: "pipeline", label: "Pipeline", type: "pipeline" },
      { key: "fecha_reunion", label: "Reunión" },
      { key: "setter", label: "Quién agendó" },
      { key: "falta", label: "Qué falta" },
    ],
    rows: pendientes.map((r) => ({
      deal_id: r.deal_id,
      cuenta: r.cuenta,
      pipeline: r.pipeline,
      fecha_reunion: fmtFecha(r.fecha_reunion),
      setter: reunionesLabel(r.agendado_por_option_id, r.agendado_por),
      falta: r.graban_llamadas == null ? "Campo “Graban llamadas”" : "Motivo de pérdida",
    })),
  };

  // ---- Tendencia: últimos 6 meses (fin = fin del periodo o mes actual), apilado por pipeline ----
  // Respeta el segmento (persona, pipeline, vertical…) pero NO el Periodo: es contexto histórico.
  const finIso = (() => {
    const p = filters.periodo;
    if (p.preset === "mes_pasado") return new Date(hd.getFullYear(), hd.getMonth() - 1, 1);
    if (p.preset === "personalizado" && p.to) return new Date(`${p.to}T12:00:00`);
    return new Date(hd.getFullYear(), hd.getMonth(), 1);
  })();
  const metasReuSeg = origenTodos
    ? metas.filter((m) => m.tipo_meta === "reuniones")
    : metas.filter((m) => m.tipo_meta === "reuniones" && m.entidad === metaEntidadSel);
  const tendencia: MesFila[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(finIso.getFullYear(), finIso.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const delMes = seg.filter((r) => r.es_calificada_realizada === true && String(r.fecha_reunion ?? "").startsWith(key));
    const meta = suma(metasReuSeg.filter((m) => String(m.periodo).startsWith(key)));
    return {
      mes: `${MESES[d.getMonth() + 1]} ${String(d.getFullYear()).slice(2)}`,
      key,
      Analytics: delMes.filter((r) => r.pipeline === "Analytics").length,
      "Voice Agent": delMes.filter((r) => r.pipeline === "Voice Agent").length,
      "No califican": seg.filter(
        (r) => r.es_realizada && r.es_calificada_realizada !== true && String(r.fecha_reunion ?? "").startsWith(key)
      ).length,
      meta: metaAplica && meta > 0 ? meta : null,
    };
  });

  // ---- Por vertical (realizadas y calificadas del periodo) ----
  const VERTS = ["Banca/Fintech", "Retail", "Salud", "Seguros", "BPO", "Sin definir"];
  const porVertical = VERTS.map((v) => ({
    nombre: v,
    realizadas: realizadas.filter((r) => (r.vertical ?? "Sin definir") === v).length,
    calif: califReal.filter((r) => (r.vertical ?? "Sin definir") === v).length,
  }));

  const agenda: AgendaItem[] = proxRows.map((r) => ({
    fecha: fmtFecha(r.fecha_reunion),
    cuenta: r.cuenta,
    deal_id: r.deal_id,
    pipeline: r.pipeline,
    graba: siNo(r.graban_llamadas),
    setter: reunionesLabel(r.agendado_por_option_id, r.agendado_por),
    ae: r.ae,
  }));
  const ritmo =
    filters.periodo.preset === "este_mes"
      ? hd.getDate() / new Date(hd.getFullYear(), hd.getMonth() + 1, 0).getDate()
      : null;

  return {
    periodo: periodoLabel(filters.periodo),
    porVertical,
    agenda,
    ritmo,
    metaAplica,
    metaAmbito,
    calif: {
      valor: califReal.length,
      meta: metaAplica ? metaCalif : null,
      metaAgendadas: metaAplica ? metaAgendadas : null,
      drill: reunionesDrill("Calificadas realizadas", califReal),
    },
    agendadas: { valor: agendadas.length, drill: reunionesDrill("Reuniones agendadas", agendadas) },
    realizadas: { valor: realizadas.length, drill: reunionesDrill("Reuniones realizadas", realizadas) },
    noCalif: {
      valor: noCalifRows.length,
      drill: reunionesDrill("Realizadas que NO califican", noCalifRows, `${noCalifRows.length} reunión(es) hechas que no cuentan para comisión`),
      razones,
    },
    showRate: agendadas.length ? realizadas.length / agendadas.length : null,
    tasaCalif: realizadas.length ? califReal.length / realizadas.length : null,
    porPipeline,
    equipo,
    proximas,
    porRevisar,
    tendencia,
    isEmpty: agendadas.length === 0 && realizadas.length === 0,
  };
}

// Fetch CRUDO (una vez). La página construye la vista con useMemo(build(raw, filters)).
export async function fetchReunionesRaw(): Promise<{ reuniones: ReunionRow[]; metas: MetaRow[] }> {
  const [reuniones, metas] = await Promise.all([fetchReuniones(), fetchMetas()]);
  return { reuniones, metas };
}
