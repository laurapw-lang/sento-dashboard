// Gate de acceso por contraseña compartida. La cookie NO guarda la contraseña:
// guarda un token derivado = HMAC-SHA256(clave=DASHBOARD_PASSWORD, "mensaje fijo").
// - No es reversible (no expone la contraseña) y no se puede forjar sin la contraseña.
// - Usa Web Crypto (crypto.subtle), disponible tanto en el middleware (edge) como en
//   las API routes (node), así el token que firma el login coincide con el que valida
//   el middleware.

export const COOKIE_NAME = "sento_dash_auth";
const MESSAGE = "sento-dashboard-gate-v1";

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Token determinístico derivado de la contraseña. Igual en login (node) y middleware (edge). */
export async function signToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(MESSAGE));
  return bufToHex(sig);
}

/** Comparación en tiempo (casi) constante para evitar timing attacks básicos. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
