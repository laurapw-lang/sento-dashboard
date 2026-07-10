// Backend SEGURO para la IA en vivo del dashboard.
// - La ANTHROPIC_API_KEY vive SOLO aquí (variable de entorno del SERVIDOR, sin prefijo
//   NEXT_PUBLIC_). Nunca llega al navegador: el front habla con /api/ask, y /api/ask
//   habla con la API de Anthropic.
// - Arma el contexto consultando las vistas reales de Supabase con la ANON key (RLS off)
//   y se lo pasa a Claude junto con la pregunta del usuario.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// Rate limit: protege el crédito de Anthropic. Configurable por env, con defaults sanos.
const RL_MAX = Number(process.env.ASK_RATE_LIMIT_MAX) || 15; // peticiones por ventana por IP
const RL_WINDOW_MS = (Number(process.env.ASK_RATE_LIMIT_WINDOW_MIN) || 60) * 60 * 1000; // default 60 min

const SYSTEM = `Eres el analista de datos del dashboard de prospección y ventas de Sento en el mercado México. Asesoras a Laura (BDR Senior).

Conoces las métricas del negocio:
- REUNIONES: la métrica principal (de pagos) es "reuniones calificadas agendadas". En v_reuniones: es_agendada = llegó a Demo Agendada o más; es_calificada = agendada Y cumple la regla de calificación. El equipo de reuniones se identifica por agendado_por_option_id: 249=Andrés Sanjuán, 274=Laura Peña, 275=Zalesmachine, 278=Edgardo Velasquez, 279=Michelle Sosa. Las metas mensuales están en metas_reuniones (por entidad y periodo).
- EMBUDO (embudo_journey): recorrido acumulativo por etapa MÁXIMA alcanzada (incluye deals perdidos por hasta dónde llegaron, no como "Perdido"). "alcanzaron" = cuántos deals llegaron a esa etapa o más.
- PIPELINE: pipeline_objetivo (≈186,000 = MRR anual 37,200 / win_rate supuesto 0.20), pipeline_actual y brecha. pipeline_actual = estado actual por etapa. El equipo AE de venta es Andrés Sanjuán, Edgardo Velasquez, Michelle Sosa.
- MOTIVOS: por qué se pierden los deals (motivos_perdida).

Reglas:
- Responde SIEMPRE en español de México, conciso y ACCIONABLE (ve al grano; recomienda, no describas de más).
- Usa SOLO los datos reales del JSON que se te pasa. NO inventes cifras. Si un dato no está o está vacío, dilo claramente.
- Formatea con markdown ligero (negritas y listas). No devuelvas tablas enormes; resume.
- Si la pregunta no se puede responder con los datos disponibles, dilo y sugiere qué haría falta.`;

async function fetchView(view: string, query = "select=*") {
  if (!SUPA_URL || !SUPA_ANON) return { error: "supabase no configurado" };
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/${view}?${query}`, {
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
      cache: "no-store",
    });
    if (!r.ok) return { error: `${view}: HTTP ${r.status}` };
    return await r.json();
  } catch (e) {
    return { error: `${view}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function POST(req: Request) {
  let question = "";
  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question : "";
  } catch {
    /* body inválido */
  }
  if (!question.trim()) {
    return NextResponse.json({ answer: "Escribe una pregunta sobre el pipeline, reuniones o metas." });
  }

  // Rate limit por IP (antes de gastar crédito de Anthropic).
  const rl = rateLimit(clientIp(req), RL_MAX, RL_WINDOW_MS);
  if (!rl.allowed) {
    const min = Math.ceil(rl.retryAfterSec / 60);
    return NextResponse.json(
      {
        answer: `⏳ Alcanzaste el límite de **${RL_MAX} preguntas** por hora para cuidar el crédito de la IA. Intenta de nuevo en ~${min} min.`,
        limited: true,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      answer:
        "⚠️ Falta **ANTHROPIC_API_KEY** en el servidor. Agrégala a `dashboard/.env.local` y reinicia `npm run dev`.",
    });
  }

  // Contexto: datos REALES de Supabase (anon key, solo lectura).
  const [embudo, pipelineActual, motivos, pipelineObjetivo, metasReuniones, reuniones] = await Promise.all([
    fetchView("v_funnel_journey", "select=*&order=rank_etapa"),
    fetchView("v_pipeline_actual"),
    fetchView("v_perdidas_motivo"),
    fetchView("v_pipeline_objetivo"),
    fetchView("metas", "operacion=ilike.*xico*&tipo_meta=eq.reuniones&select=entidad,periodo,meta_valor&order=entidad,periodo"),
    fetchView(
      "v_reuniones",
      "select=cuenta,agendado_por_option_id,agendado_por,ae,etapa,mes_reunion,es_agendada,es_realizada,es_calificada,es_calificada_realizada"
    ),
  ]);

  const contexto = {
    equipo_reuniones_option_id: { "249": "Andrés Sanjuán", "274": "Laura Peña", "275": "Zalesmachine", "278": "Edgardo Velasquez", "279": "Michelle Sosa" },
    equipo_ae_owner_id: { "24943809": "Andrés Sanjuán", "25734203": "Edgardo Velasquez", "25734214": "Michelle Sosa" },
    embudo_journey: embudo,
    pipeline_actual: pipelineActual,
    pipeline_objetivo: pipelineObjetivo,
    motivos_perdida: motivos,
    metas_reuniones: metasReuniones,
    reuniones: reuniones,
  };

  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Datos reales del dashboard (JSON):\n\n${JSON.stringify(contexto)}\n\nPregunta de Laura: ${question}`,
        },
      ],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ answer: text || "(sin respuesta)" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ answer: `Error al llamar a la IA (${MODEL}): ${msg}` });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", route: "/api/ask", model: MODEL, mock: false });
}
