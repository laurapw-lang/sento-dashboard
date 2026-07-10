// Cliente de Supabase de SOLO LECTURA, con la ANON key desde variables de entorno
// públicas (NEXT_PUBLIC_*). NUNCA la service_role aquí — la anon key respeta RLS y
// solo puede leer lo que los grants permiten (ver sql/T0-grants.sql).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

let _client: SupabaseClient | null = null;

/** Devuelve el cliente, o lanza un error legible si faltan las variables de entorno. */
export function getSupabase(): SupabaseClient {
  if (!url || !anon) {
    throw new Error(
      "Supabase no está configurado. Crea dashboard/.env.local con NEXT_PUBLIC_SUPABASE_URL " +
        "y NEXT_PUBLIC_SUPABASE_ANON_KEY, y reinicia el servidor (npm run dev)."
    );
  }
  if (!_client) {
    _client = createClient(url, anon, {
      auth: { persistSession: false },
    });
  }
  return _client;
}
