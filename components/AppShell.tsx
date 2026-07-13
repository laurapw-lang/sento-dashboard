"use client";

import { usePathname } from "next/navigation";
import { DrillProvider } from "./DrillDown";
import { FilterProvider } from "@/lib/filters";
import { Sidebar } from "./Sidebar";

// Envuelve toda la app: provee el contexto de drill-down y el layout de dos columnas.
// El <Topbar> se coloca por página para poder pasarle el título de la sección.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // La pantalla de login va a pantalla completa, sin sidebar ni contexto de drill-down.
  if (pathname === "/login") return <>{children}</>;

  return (
    <FilterProvider>
      <DrillProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </DrillProvider>
    </FilterProvider>
  );
}
