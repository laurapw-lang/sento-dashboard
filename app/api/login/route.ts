// Valida la contraseña compartida contra DASHBOARD_PASSWORD (variable del SERVIDOR,
// nunca en el cliente) y, si es correcta, deja una cookie HttpOnly firmada para no
// volver a pedirla en cada página.

import { NextResponse } from "next/server";
import { COOKIE_NAME, signToken, safeEqual } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    /* body inválido */
  }

  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) {
    return NextResponse.json(
      { ok: false, error: "El gate no está configurado (falta DASHBOARD_PASSWORD en el servidor)." },
      { status: 500 }
    );
  }

  if (!password || !safeEqual(password, pw)) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await signToken(pw), {
    httpOnly: true, // no accesible desde JS del cliente
    secure: process.env.NODE_ENV === "production", // en local (http) se permite; en Vercel (https) obligatorio
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return res;
}
