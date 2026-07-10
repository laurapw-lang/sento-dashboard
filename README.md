# Sento · Command Center (Dashboard)

Dashboard de prospección y venta para la Operación México. **Este paso es solo el
esqueleto navegable con datos MOCK** — todavía NO se conecta a Supabase ni a la
API de Anthropic. La estructura ya está lista para cablear ambos después.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** (estética dark "command-center": navy/ink + acentos prism/espectro)
- **Recharts** para las gráficas
- API route (`app/api/ask/route.ts`) como **proxy seguro** para la IA (la key vive
  solo en el servidor)

## Cómo correrlo local

```bash
cd dashboard
npm install
npm run dev
```

Abre http://localhost:3000 — la home redirige a **/reuniones**.

> Sin `.env.local` funciona igual: todo es mock. Para cuando se conecte, copia
> `.env.example` a `.env.local` y rellena los valores (ver más abajo).

## Secciones (barra lateral)

| Ruta | Sección | Contenido |
|------|---------|-----------|
| `/venta` | **Venta / Pipeline** | KPIs (MRR vs meta, logos vs meta=18, pipeline objetivo 186k vs actual), embudo por etapa, forecast, pipeline por AE / origen / vertical, deals estancados, razones de pérdida |
| `/reuniones` | **Reuniones** (central) | KPIs (calificadas agendadas vs meta = métrica principal, agendadas, realizadas, calificadas realizadas, show rate, tasa de calificación), desglose por persona y canal, vista mensual |
| `/prospeccion` | **Prospección** (Fase 1) | Placeholders con aviso "sin datos aún" (funnel, canales, A/B, entregabilidad) |
| `/insights` | **Insights IA** | Lista de insights + chat de IA en vivo (cableado a `/api/ask`, respuesta mock) |

## Características ya implementadas (esqueleto)

- **Barra de filtros globales** (periodo, vertical, AE, carril, origen) — placeholder,
  aún no filtran.
- **Drill-down**: los KPI cards y las gráficas son **clicables** → abren un panel
  lateral con las filas que componen el número (mock). Ver `components/DrillDown.tsx`.
- **Metas tentativas**: las métricas cuya meta es provisional muestran un badge
  `✳ tentativo` (ej. pipeline objetivo, que depende del win_rate supuesto 0.20).
- **Componentes reutilizables**: `KpiCard` (con "vs meta" + badge), `ChartCard`
  (Recharts: bar / funnel / pie / line), `DataTable`, `DrillDown` (panel), `Badge`.

## Estructura

```
dashboard/
├─ app/
│  ├─ layout.tsx            # shell + provider de drill-down
│  ├─ page.tsx              # redirige a /reuniones
│  ├─ globals.css
│  ├─ venta/page.tsx
│  ├─ reuniones/page.tsx
│  ├─ prospeccion/page.tsx
│  ├─ insights/page.tsx
│  └─ api/ask/route.ts      # proxy seguro para la IA (mock hoy)
├─ components/              # Sidebar, Topbar, KpiCard, ChartCard, DataTable,
│                          # DrillDown, Badge, AppShell, InsightsChat, PageBody
├─ lib/
│  ├─ types.ts              # Kpi, ChartSpec, DrillPayload
│  └─ mock.ts               # TODOS los datos mock (reflejan el modelo real)
├─ .env.example             # sin valores reales
└─ ...config (next, tailwind, tsconfig, postcss)
```

## Variables de entorno (para el paso de conexión, NO ahora)

Copiar `.env.example` → `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — pública (solo la URL).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — pública (anon; **nunca** la service_role).
- `ANTHROPIC_API_KEY` — **solo servidor**, la usa `app/api/ask/route.ts`. Nunca
  con prefijo `NEXT_PUBLIC_`, nunca en el front.

## Próximos pasos (fuera de este esqueleto)

1. Conectar `lib/mock.ts` → queries reales a Supabase (vistas `v_reuniones`,
   `v_pipeline_objetivo`, tabla `metas`, `fact_deals`).
2. Cablear la barra de filtros a un estado global + params de query.
3. Implementar la llamada real a Anthropic dentro de `/api/ask`.
4. Poblar el drill-down con las filas reales que componen cada métrica.
