"use client";

import { Topbar } from "@/components/Topbar";
import { PageBody, SectionTitle } from "@/components/PageBody";
import { Pill } from "@/components/Badge";
import { InsightsChat } from "@/components/InsightsChat";
import { insightsMock } from "@/lib/mock";

export default function InsightsPage() {
  return (
    <>
      <Topbar title="Insights IA" />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Panel de insights */}
          <section className="space-y-3">
            <SectionTitle>Insights generados</SectionTitle>
            <div className="space-y-3">
              {insightsMock.map((ins) => (
                <div key={ins.id} className="rounded-xl border border-line bg-card p-4 shadow-card">
                  <div className="mb-2 flex items-center gap-2">
                    <Pill tone={ins.sev === "warn" ? "warn" : "info"}>{ins.tag}</Pill>
                  </div>
                  <p className="text-sm text-ink">{ins.text}</p>
                </div>
              ))}
              <p className="text-[11px] text-ink-muted">
                Insights de ejemplo. Se generarán a partir de datos reales en el paso de conexión.
              </p>
            </div>
          </section>

          {/* Chat de IA en vivo (placeholder cableado a /api/ask) */}
          <section className="space-y-3">
            <SectionTitle>Chat de IA en vivo</SectionTitle>
            <InsightsChat />
          </section>
        </div>
      </PageBody>
    </>
  );
}
