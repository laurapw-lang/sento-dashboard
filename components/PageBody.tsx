export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-7">{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
      <span className="h-1 w-1 rounded-full bg-[#3FA9FF]" />
      {children}
    </h2>
  );
}
