// Bloques de estado reutilizables: carga, error y "sin datos".

export function LoadingBlock({ label = "Cargando datos…" }: { label?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-line bg-card text-ink-muted shadow-card">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-[#3FA9FF]" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-semaforo-red/30 bg-semaforo-red/8 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#C23B3A]">
        <span>⚠</span> No se pudieron cargar los datos
      </div>
      <p className="whitespace-pre-wrap text-xs text-[#B5504F]">{message}</p>
    </div>
  );
}

export function EmptyBlock({ label = "Sin datos aún" }: { label?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-card/60 text-center">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-2 rounded-full border border-line px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
        vista vacía
      </div>
    </div>
  );
}
