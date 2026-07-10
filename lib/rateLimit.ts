// Rate limit SIMPLE en memoria (sin dependencias externas) para proteger el crédito
// de Anthropic en /api/ask.
//
// ⚠️ Nota sobre serverless (Vercel): la memoria NO se comparte entre instancias ni
// sobrevive a un cold start, así que este límite es "best-effort" — suficiente para
// frenar abuso de un equipo pequeño detrás del gate de contraseña. Si algún día se
// necesita un límite ESTRICTO y global, migrar a Upstash Redis (@upstash/ratelimit).

type Store = Map<string, number[]>; // ip -> timestamps (ms) dentro de la ventana

// Persiste entre invocaciones dentro de la MISMA instancia (globalThis evita que el
// hot-reload de dev cree varios mapas).
const g = globalThis as unknown as { __askRateStore?: Store };
const store: Store = g.__askRateStore ?? (g.__askRateStore = new Map());

export type RateResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/** Ventana deslizante: máximo `max` peticiones por `windowMs` por clave (IP). */
export function rateLimit(keyRaw: string, max: number, windowMs: number): RateResult {
  const key = keyRaw || "unknown";
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
    store.set(key, hits);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  hits.push(now);
  store.set(key, hits);
  return { allowed: true, remaining: max - hits.length, retryAfterSec: 0 };
}

/** Extrae la IP del cliente de las cabeceras que pone Vercel/proxies. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
