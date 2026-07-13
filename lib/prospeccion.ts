// Carga de la sección Prospección. Para soportar el filtro de PERIODO (y luego
// vertical/carril/canal), el funnel/comparativa/A-B se construyen desde la tabla CRUDA
// fact_prospeccion (que tiene fecha, canal, vertical, carril), no desde las vistas
// pre-agregadas. El segmento→reunión (v_funnel_prospeccion) y la entregabilidad
// (v_deliverability) no tienen grano de fecha → el Periodo no las afecta (nota en la UI).

import { fetchView } from "./db";
import { inPeriodo, matchVertical, type Filters } from "./filters";
import { isReunionesTeam } from "./team";

export type Row = Record<string, any>;
const num = (v: any) => (v == null ? 0 : Number(v) || 0);
const pct = (a: number, b: number) => (b > 0 ? Math.round((1000 * a) / b) / 10 : 0);

export type ProspeccionRaw = {
  prospeccion: Row[]; // fact_prospeccion CRUDO
  reuniones: Row[]; // v_reuniones CRUDO (para el segmento, filtrable por periodo)
  deliverability: Row[]; // v_deliverability
  delResumen: Row[]; // v_deliverability_resumen
};

export async function fetchProspeccionRaw(): Promise<ProspeccionRaw> {
  const [prospeccion, reuniones, deliverability, delResumen] = await Promise.all([
    fetchView("fact_prospeccion"),
    fetchView("v_reuniones"),
    fetchView("v_deliverability"),
    fetchView("v_deliverability_resumen"),
  ]);
  return { prospeccion, reuniones, deliverability, delResumen };
}

export type ProspeccionData = {
  funnelCanal: Row[]; // tidy: canal, orden, etapa, valor
  canal: Row[]; // por canal + tasas
  segmento: Row[]; // v_funnel_prospeccion (no filtrada por periodo)
  deliverability: Row[];
  deliverabilityResumen: Row | null;
  ab: Row[];
  prospEmpty: boolean;
  deliverabilityEmpty: boolean;
  abTieneDatos: boolean;
};

const CANALES = ["LinkedIn", "Email"];

export function buildProspeccion(raw: ProspeccionRaw, filters: Filters): ProspeccionData {
  // fact_prospeccion filtrado por PERIODO (fecha) + VERTICAL. (carril/canal: partes siguientes)
  const rows = raw.prospeccion
    .filter((r) => inPeriodo(r.fecha, filters.periodo))
    .filter((r) => matchVertical(r.vertical, filters));
  const sumFor = (canal: string, key: string) =>
    rows.filter((r) => r.canal === canal).reduce((s, r) => s + num(r[key]), 0);
  const canalesConDatos = CANALES.filter((c) => sumFor(c, "contactados") > 0);

  // --- funnel tidy por canal ---
  const funnelCanal: Row[] = [];
  for (const c of canalesConDatos) {
    const contactados = sumFor(c, "contactados");
    const respuestas = sumFor(c, "respuestas");
    const interesados = sumFor(c, "respuestas_pos");
    if (c === "LinkedIn") {
      funnelCanal.push(
        { canal: c, orden: 1, etapa: "Enviadas", valor: contactados },
        { canal: c, orden: 2, etapa: "Aceptadas", valor: sumFor(c, "aceptadas") },
        { canal: c, orden: 3, etapa: "Respuestas", valor: respuestas },
        { canal: c, orden: 4, etapa: "Interesados", valor: interesados }
      );
    } else {
      funnelCanal.push(
        { canal: c, orden: 1, etapa: "Enviados", valor: contactados },
        { canal: c, orden: 2, etapa: "Aperturas", valor: sumFor(c, "aperturas") },
        { canal: c, orden: 3, etapa: "Clicks", valor: sumFor(c, "clicks") },
        { canal: c, orden: 4, etapa: "Respuestas", valor: respuestas },
        { canal: c, orden: 5, etapa: "Interesados", valor: interesados }
      );
    }
  }

  // --- comparativa por canal ---
  const canal: Row[] = canalesConDatos.map((c) => {
    const contactados = sumFor(c, "contactados");
    const respuestas = sumFor(c, "respuestas");
    const interesados = sumFor(c, "respuestas_pos");
    return {
      canal: c,
      contactados,
      aceptadas: sumFor(c, "aceptadas"),
      aperturas: sumFor(c, "aperturas"),
      clicks: sumFor(c, "clicks"),
      respuestas,
      interesados,
      resp_pct: pct(respuestas, contactados),
      interes_pct: pct(interesados, contactados),
    };
  });

  // --- A/B por canal × campaña × variante ---
  const abMap = new Map<string, Row>();
  for (const r of rows) {
    const k = `${r.canal}||${r.campana}||${r.variante}`;
    const cur = abMap.get(k) ?? {
      canal: r.canal,
      campana: r.campana,
      variante: r.variante,
      contactados: 0,
      respuestas: 0,
      interesados: 0,
    };
    cur.contactados += num(r.contactados);
    cur.respuestas += num(r.respuestas);
    cur.interesados += num(r.respuestas_pos);
    abMap.set(k, cur);
  }
  const ab: Row[] = Array.from(abMap.values()).map((r) => ({ ...r, interes_pct: pct(r.interesados, r.contactados) }));

  // --- Segmento → reunión (vertical × carril): prospección (filtrada) + reuniones del
  // equipo (filtradas por periodo). Reconstruido desde crudo para respetar el filtro y
  // cuadrar con la sección Reuniones (mismo team + fecha_reunion). Atribución aproximada.
  type Seg = { contactados: number; interesados: number; agendadas: number; calificadas: number; realizadas: number; no_shows: number };
  const segMap = new Map<string, Seg>();
  const seg = (k: string): Seg =>
    segMap.get(k) ?? { contactados: 0, interesados: 0, agendadas: 0, calificadas: 0, realizadas: 0, no_shows: 0 };
  for (const r of rows) {
    const k = `${r.vertical}||${r.carril}`;
    const s = seg(k);
    s.contactados += num(r.contactados);
    s.interesados += num(r.respuestas_pos);
    segMap.set(k, s);
  }
  const reunTeam = raw.reuniones
    .filter((r) => isReunionesTeam(r.agendado_por_option_id))
    .filter((r) => inPeriodo(r.fecha_reunion, filters.periodo))
    .filter((r) => matchVertical(r.vertical, filters));
  for (const r of reunTeam) {
    const k = `${r.vertical}||${r.carril}`;
    const s = seg(k);
    if (r.es_agendada) s.agendadas++;
    if (r.es_calificada) s.calificadas++;
    if (r.es_realizada) s.realizadas++;
    if (r.es_agendada && !r.es_realizada) s.no_shows++;
    segMap.set(k, s);
  }
  const segmento: Row[] = Array.from(segMap.entries()).map(([k, s]) => {
    const [vertical, carril] = k.split("||");
    return { vertical, carril, ...s };
  });

  return {
    funnelCanal,
    canal,
    segmento,
    deliverability: raw.deliverability,
    deliverabilityResumen: raw.delResumen.length ? raw.delResumen[0] : null,
    ab,
    prospEmpty: rows.length === 0,
    deliverabilityEmpty: raw.deliverability.length === 0,
    abTieneDatos: ab.some((r) => num(r.contactados) > 0),
  };
}

/** Etapas de un canal desde el funnel tidy, ordenadas. */
export function etapasDe(funnelCanal: Row[], canal: string) {
  return funnelCanal
    .filter((r) => r.canal === canal)
    .map((r) => ({ etapa: String(r.etapa), valor: num(r.valor), orden: num(r.orden) }))
    .sort((a, b) => a.orden - b.orden);
}
