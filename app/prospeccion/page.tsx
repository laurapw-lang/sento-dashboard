"use client";

import { Topbar } from "@/components/Topbar";
import { PageBody, SectionTitle } from "@/components/PageBody";
import { Pill } from "@/components/Badge";

// Prospección (Fase 1). Por ahora placeholders vacíos con aviso: los datos de
// funnel, canales, variantes A/B y entregabilidad llegan de Smartlead/HeyReach/
// Zalesmachine en una fase posterior.
const PLACEHOLDERS = [
  { title: "Funnel de prospección", desc: "Enviados → Abiertos → Respuestas → Reuniones" },
  { title: "Por canal", desc: "Email (Smartlead) · LinkedIn (HeyReach) · Zalesmachine" },
  { title: "Variantes A/B", desc: "Comparativa de copy / asunto por variante" },
  { title: "Entregabilidad", desc: "Bounce, spam, warmup, salud de buzones" },
];

export default function ProspeccionPage() {
  return (
    <>
      <Topbar title="Prospección" />
      <PageBody>
        <div className="flex items-center gap-2">
          <Pill tone="warn">Fase 1 — pendiente de datos</Pill>
          <span className="text-xs text-ink-muted">
            Estos paneles se cablearán cuando la ingesta de outbound esté conectada.
          </span>
        </div>

        <section>
          <SectionTitle>Paneles previstos</SectionTitle>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PLACEHOLDERS.map((p) => (
              <div
                key={p.title}
                className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-card text-center shadow-card"
              >
                <div className="text-sm font-semibold text-ink">{p.title}</div>
                <div className="mt-1 max-w-xs text-xs text-ink-muted">{p.desc}</div>
                <div className="mt-3 rounded-full border border-line px-3 py-1 text-[10px] uppercase tracking-wide text-ink-muted">
                  sin datos aún
                </div>
              </div>
            ))}
          </div>
        </section>
      </PageBody>
    </>
  );
}
