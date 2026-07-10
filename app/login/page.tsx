"use client";

// Pantalla de acceso. Envía la contraseña a /api/login (server-side). Si es correcta,
// la cookie queda puesta y redirige al dashboard. Renderiza sin el AppShell (ver AppShell).

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.replace("/");
        router.refresh();
      } else {
        setError(data.error || "Contraseña incorrecta.");
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-8 shadow-card"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-spectrum-gradient" />
          <h1 className="text-lg font-semibold text-ink">Dashboard Sento · México</h1>
          <p className="mt-1 text-sm text-ink-muted">Acceso del equipo. Ingresa la contraseña.</p>
        </div>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-[#3FA9FF]"
        />

        {error && <p className="mt-2 text-sm text-semaforo-red">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-lg bg-spectrum-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {loading ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
