export default function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-chestnut" aria-hidden="true" />
      {children}
    </p>
  );
}
