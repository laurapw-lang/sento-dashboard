"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/venta", label: "Venta / Pipeline", icon: "▤", desc: "MRR, logos, forecast" },
  { href: "/reuniones", label: "Reuniones", icon: "◎", desc: "Calificadas, show rate", star: true },
  { href: "/prospeccion", label: "Prospección", icon: "◇", desc: "Funnel, canales (Fase 1)" },
  { href: "/insights", label: "Insights IA", icon: "✦", desc: "Análisis + chat" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-card">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-spectrum-gradient shadow-sm">
          <span className="text-sm font-bold text-white">S</span>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">Sento</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Command Center</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 pt-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                active ? "bg-canvas text-ink" : "text-ink-muted hover:bg-canvas/70 hover:text-ink"
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-spectrum-gradient" />}
              <span className={`mt-0.5 text-sm ${active ? "text-[#3FA9FF]" : "text-slate-400 group-hover:text-ink-muted"}`}>
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {item.label}
                  {item.star && <span className="text-[9px] text-[#7C5CFF]">●</span>}
                </span>
                <span className="block truncate text-[11px] text-ink-muted">{item.desc}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-5 py-3.5 text-[11px] text-ink-muted">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-semaforo-green" />
          Mercado México · BDR Laura
        </div>
        <div className="mt-1 text-slate-400">datos en vivo · Supabase</div>
      </div>
    </aside>
  );
}
