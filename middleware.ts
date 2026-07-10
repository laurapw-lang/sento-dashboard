// Gate de contraseña DEL LADO DEL SERVIDOR. Corre antes de renderizar cualquier página
// o API (salvo las exclusiones del matcher). No se puede saltar desde el cliente.
//
// - Si NO hay DASHBOARD_PASSWORD configurada -> gate abierto (comodidad de dev local).
//   En Vercel SIEMPRE hay que configurarla para que el gate proteja el sitio.
// - Valida la cookie contra el token derivado de la contraseña (ver lib/auth.ts).
// - Sin cookie válida: las páginas redirigen a /login; las APIs devuelven 401 JSON.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, signToken } from "./lib/auth";

export const config = {
  // Protege todo MENOS: assets de Next, favicon, la propia pantalla de login y su API.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/login).*)"],
};

export async function middleware(req: NextRequest) {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return NextResponse.next(); // sin gate configurado (dev)

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token && token === (await signToken(pw))) return NextResponse.next();

  // No autenticado.
  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "No autorizado. Inicia sesión en el dashboard." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}
