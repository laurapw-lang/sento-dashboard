export function TentativoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Meta tentativa — sujeta a validación"
      className={`inline-flex items-center gap-1 rounded-full border border-[#7C5CFF]/25 bg-[#7C5CFF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6D4EE6] ${className}`}
    >
      ✳ tentativo
    </span>
  );
}

export function Pill({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warn" | "ok";
}) {
  const map = {
    info: "border-spectrum-blue/30 bg-spectrum-blue/10 text-[#2478C7]",
    warn: "border-semaforo-amber/30 bg-semaforo-amber/12 text-[#B9770F]",
    ok: "border-semaforo-green/30 bg-semaforo-green/12 text-[#158060]",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}
