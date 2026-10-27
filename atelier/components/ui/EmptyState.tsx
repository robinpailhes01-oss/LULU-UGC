import { cx } from "@/components/ui/cx";

/** État vide : une icône, une phrase, une action. Jamais de culpabilisation. */
export function EmptyState({ icon, title, children, action, className }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center", className)}>
      {icon ? <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-chestnut">{icon}</div> : null}
      <h3 className="font-display text-[1.25rem] font-[400] text-ink">{title}</h3>
      {children ? <div className="mt-2 text-[13.5px] leading-relaxed text-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
