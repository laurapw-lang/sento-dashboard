import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F8FB", // fondo de página (gris muy claro, no blanco)
        card: "#FFFFFF",
        line: "#E5E9F0", // borde sutil
        ink: {
          DEFAULT: "#1A2130", // texto primario
          muted: "#5E6B82", // texto secundario
        },
        // Semáforos (dominan la lectura de metas/KPIs)
        semaforo: {
          green: "#1D9E75",
          amber: "#EF9F27",
          red: "#E24B4A",
        },
        // Espectro Sento (acentos: logo + series de gráficas no-semáforo)
        spectrum: {
          violet: "#7C5CFF",
          blue: "#3FA9FF",
          cyan: "#29D3D3",
          green: "#2BD98C",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      backgroundImage: {
        "spectrum-gradient":
          "linear-gradient(90deg, #7C5CFF 0%, #3FA9FF 40%, #29D3D3 70%, #2BD98C 100%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.05)",
        cardhover: "0 6px 16px -4px rgba(16,24,40,0.10), 0 2px 6px rgba(16,24,40,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
