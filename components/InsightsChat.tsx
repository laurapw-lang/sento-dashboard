"use client";

// Chat de IA EN VIVO. Habla con el proxy seguro /api/ask, que llama a Claude con la
// ANTHROPIC_API_KEY del SERVIDOR (nunca en el front) y le pasa datos reales de Supabase.

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Cuál es mi brecha de pipeline?",
  "¿Por qué se caen los deals en Demo Realizada?",
  "¿Quién va mejor vs su meta de reuniones?",
];

export function InsightsChat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hola Laura 👋 Pregúntame sobre el **pipeline**, las **reuniones**, el **embudo** o las **metas** del equipo México. Analizo los datos reales del dashboard.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? "(sin respuesta)" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Error al contactar `/api/ask`." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[520px] flex-col rounded-xl border border-line bg-card shadow-card">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-semaforo-green" /> Chat de IA
          <span className="ml-auto text-[10px] uppercase tracking-wide text-ink-muted">datos reales · claude</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-[#3FA9FF]/12 text-ink" : "border border-line bg-canvas text-ink"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="leading-relaxed [&_a]:text-[#2478C7] [&_a]:underline [&_code]:rounded [&_code]:bg-white/70 [&_code]:px-1 [&_code]:text-[12px] [&_h3]:mt-1 [&_h3]:font-semibold [&_li]:mt-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mt-1 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl border border-line bg-canvas px-3 py-2 text-ink-muted">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted" />
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] text-ink-muted transition-colors hover:border-[#3FA9FF] hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-line p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder="Pregunta sobre pipeline, reuniones, metas…"
            className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-[#3FA9FF]"
          />
          <button
            onClick={() => ask(input)}
            disabled={loading}
            className="rounded-lg bg-spectrum-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
