import { cx } from "@/components/ui/cx";
import { clientColor, clientInitials } from "@/lib/shared/clients";

const SIZES = { xs: "h-5 w-5 text-[9px]", sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-[13px]", lg: "h-12 w-12 text-[16px]", xl: "h-16 w-16 text-[21px]" };

/** Avatar d'un client : ses initiales sur sa couleur. `null` = « Tous les clients ». */
export function ClientAvatar({ client, size = "sm", className }: { client: { name: string; color: string | null } | null; size?: keyof typeof SIZES; className?: string }) {
  if (!client) {
    return (
      <span aria-hidden className={cx("inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong bg-surface font-semibold text-muted", SIZES[size], className)}>
        <svg viewBox="0 0 16 16" className="h-[55%] w-[55%]" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="5" cy="5" r="2.2" />
          <circle cx="11" cy="5" r="2.2" />
          <circle cx="5" cy="11" r="2.2" />
          <circle cx="11" cy="11" r="2.2" />
        </svg>
      </span>
    );
  }
  return (
    <span aria-hidden className={cx("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-[0.02em] text-surface", SIZES[size], className)} style={{ backgroundColor: clientColor(client) }}>
      {clientInitials(client.name)}
    </span>
  );
}
