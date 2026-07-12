// Carga de la sección Prospección. Lee las vistas ya creadas (solo lectura, anon).
// fact_prospeccion está vacía hasta que el Flujo 4 corra (Fase 1) → las partes de
// prospección quedan vacías y la UI muestra "sin datos aún". La parte de reuniones
// (v_funnel_prospeccion) SÍ trae datos reales.

import { fetchView } from "./db";

export type Row = Record<string, any>;

export type ProspeccionData = {
  funnelCanal: Row[];              // v_prospeccion_funnel (tidy: canal, orden, etapa, valor)
  canal: Row[];                    // v_prospeccion_canal
  segmento: Row[];                 // v_funnel_prospeccion (vertical×carril + reuniones)
  deliverability: Row[];           // v_deliverability (por dominio)
  deliverabilityResumen: Row | null; // v_deliverability_resumen (1 fila)
  ab: Row[];                       // v_prospeccion_ab
  // flags de estado por sección
  prospEmpty: boolean;             // fact_prospeccion vacía → funnel/canal/AB sin datos
  segmentoTieneReuniones: boolean; // v_funnel_prospeccion trae agendadas/calificadas reales
  deliverabilityEmpty: boolean;    // fact_deliverability vacía
  abTieneDatos: boolean;
};

const num = (v: any) => (v == null ? 0 : Number(v) || 0);

export async function loadProspeccion(): Promise<ProspeccionData> {
  const [funnelCanal, canal, segmento, deliverability, delResumen, ab] = await Promise.all([
    fetchView("v_prospeccion_funnel"),
    fetchView("v_prospeccion_canal"),
    fetchView("v_funnel_prospeccion"),
    fetchView("v_deliverability"),
    fetchView("v_deliverability_resumen"),
    fetchView("v_prospeccion_ab"),
  ]);

  return {
    funnelCanal,
    canal,
    segmento,
    deliverability,
    deliverabilityResumen: delResumen.length ? delResumen[0] : null,
    ab,
    prospEmpty: canal.length === 0 && funnelCanal.length === 0,
    segmentoTieneReuniones: segmento.some((r) => num(r.agendadas) > 0 || num(r.calificadas) > 0),
    deliverabilityEmpty: deliverability.length === 0,
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
