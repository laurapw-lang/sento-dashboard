// Insights AUTOMÁTICOS calculados con datos reales (sin IA y sin texto inventado).
// Reglas simples y explicables sobre el mes en curso: ritmo vs meta, datos faltantes que
// frenan la calificación, deals atorados y mezcla de pipelines.

import type { DrillPayload, DealRow, MetaRow, ReunionRow } from "./types";
import { fetchDeals, fetchMetas, fetchReuniones } from "./db";
import { DEFAULT_FILTERS } from "./filters";
import { buildReuniones } from "./reuniones";
import { buildVenta } from "./venta";
import { isAeVenta } from "./team";

export type Insight = { id: string; tag: string; sev: "warn" | "ok" | "info"; titulo: string; texto: string; drill?: DrillPayload };

export async function fetchInsightsRaw() {
  const [reuniones, deals, metas] = await Promise.all([fetchReuniones(), fetchDeals(), fetchMetas()]);
  return { reuniones, deals, metas };
}

export function buildInsights(raw: { reuniones: ReunionRow[]; deals: DealRow[]; metas: MetaRow[] }): Insight[] {
  const out: Insight[] = [];
  const f = DEFAULT_FILTERS; // este mes, sin segmentar
  const r = buildReuniones(raw.reuniones, raw.metas, f);
  const v = buildVenta(raw.deals, raw.metas, null, f);

  // Ritmo del mes: % de la meta vs % del mes transcurrido.
  const hoy = new Date();
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const avanceMes = hoy.getDate() / diasMes;
  for (const p of r.equipo) {
    if (!p.meta) continue;
    const pct = p.calif / p.meta;
    const esperado = Math.round(p.meta * avanceMes);
    const atras = pct + 0.1 < avanceMes;
    out.push({
      id: `ritmo-${p.nombre}`,
      tag: "Ritmo del mes",
      sev: pct >= 1 ? "ok" : atras ? "warn" : "info",
      titulo: `${p.nombre}: ${p.calif} de ${p.meta} calificadas`,
      texto:
        pct >= 1
          ? "Meta del mes cumplida."
          : `A esta altura del mes (${Math.round(avanceMes * 100)}% transcurrido) el ritmo esperado sería ~${esperado}. ` +
            (atras ? `Va ${esperado - p.calif} por debajo del ritmo.` : "Va en ritmo."),
      drill: p.drill,
    });
  }

  if (r.porRevisar.rows.length) {
    out.push({
      id: "pendientes",
      tag: "Dato faltante",
      sev: "warn",
      titulo: `${r.porRevisar.rows.length} reunión(es) realizada(s) este mes sin poder calificar`,
      texto: "Falta capturar “Graban llamadas” o el motivo de pérdida en Pipedrive. Hasta entonces no cuentan como calificadas.",
      drill: r.porRevisar,
    });
  }

  const proxSinDato = r.proximas.rows.filter((x) => x.graba === "pendiente");
  if (proxSinDato.length) {
    out.push({
      id: "proximas",
      tag: "Antes de la reunión",
      sev: "info",
      titulo: `${proxSinDato.length} reunión(es) próxima(s) sin “Graban llamadas” capturado`,
      texto: "Conviene confirmarlo en la reunión y capturarlo después; es el campo que decide si califica.",
      drill: { ...r.proximas, rows: proxSinDato, subtitle: `${proxSinDato.length} sin el dato` },
    });
  }

  if (v.atencion.rows.length) {
    const sinPaso = v.atencion.rows.filter((x) => String(x.siguiente).startsWith("⚠")).length;
    out.push({
      id: "atorados",
      tag: "Pipeline",
      sev: "warn",
      titulo: `${v.atencion.rows.length} deal(s) abiertos atorados`,
      texto: `≥14 días en la misma etapa o ≥10 días sin actividad${sinPaso ? `; ${sinPaso} sin siguiente paso agendado` : ""}.`,
      drill: v.atencion,
    });
  }

  const [va, an] = [v.porPipeline.find((p) => p.nombre === "Voice Agent"), v.porPipeline.find((p) => p.nombre === "Analytics")];
  if (va && an) {
    const total = va.mrr + an.mrr;
    out.push({
      id: "mix",
      tag: "Pipelines",
      sev: "info",
      titulo: `Voice Agent: ${va.abiertos} deal(s) abiertos · Analytics: ${an.abiertos}`,
      texto: total
        ? `Voice Agent es ${Math.round((va.mrr / total) * 100)}% del MRR abierto.`
        : "Aún sin MRR capturado en los deals abiertos (campo valor vacío en Pipedrive).",
      drill: va.drill,
    });
  }

  const sinMrr = raw.deals.filter((d) => d.etapa !== "Perdido" && !d.mrr && isAeVenta(d.owner_id)).length;
  if (sinMrr) {
    out.push({
      id: "sin-mrr",
      tag: "Calidad del CRM",
      sev: "info",
      titulo: `${sinMrr} deal(s) abiertos/ganados sin valor (MRR) en Pipedrive`,
      texto: "El pipeline y el forecast salen bajos mientras el valor del deal esté vacío.",
    });
  }

  if (v.motivos[0]) {
    out.push({
      id: "motivo",
      tag: "Pérdidas",
      sev: "info",
      titulo: `Motivo de pérdida #1: ${v.motivos[0].motivo}`,
      texto: `${v.motivos[0].deals} deal(s) perdidos por este motivo (histórico del equipo).`,
      drill: v.motivos[0].drill,
    });
  }

  const orden = { warn: 0, info: 1, ok: 2 } as const;
  return out.sort((a, b) => orden[a.sev] - orden[b.sev]);
}
