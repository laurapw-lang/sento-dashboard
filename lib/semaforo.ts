// Fuente ÚNICA de la lógica de semáforos. Cambiar umbrales/colores aquí.
// pct = porcentaje de avance vs meta (puede superar 100).

export type SemaforoKey = "green" | "amber" | "red";

export type Semaforo = {
  key: SemaforoKey;
  color: string; // color sólido (borde izq, barra, ícono)
  soft: string; // fondo tenue (badge)
  label: string; // "Meta cumplida" | "En riesgo" | "Debajo"
  icon: string; // check / alerta / círculo
};

export function getSemaforo(pct: number): Semaforo {
  if (pct >= 100) return { key: "green", color: "#1D9E75", soft: "rgba(29,158,117,0.12)", label: "Meta cumplida", icon: "✓" };
  if (pct >= 60) return { key: "amber", color: "#EF9F27", soft: "rgba(239,159,39,0.14)", label: "En riesgo", icon: "⚠" };
  return { key: "red", color: "#E24B4A", soft: "rgba(226,75,74,0.12)", label: "Debajo", icon: "●" };
}

// Color neutro para KPIs sin meta (no aplica semáforo).
export const NEUTRAL = "#C6CEDA";
