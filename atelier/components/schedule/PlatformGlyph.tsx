import { cx } from "@/components/ui/cx";
import { PLATFORM_LABEL } from "@/lib/shared/labels";

/**
 * Pictogrammes monochromes des plateformes (lucide n'a pas d'icônes de marque).
 * Tracés simplifiés en currentColor, à la manière de lucide : pas de couleurs de marque.
 */
export function PlatformGlyph({ platform, className, title }: { platform: string; className?: string; title?: string | false }) {
  const label = PLATFORM_LABEL[platform] ?? platform;
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cx("h-4 w-4 shrink-0", className),
    role: title === false ? undefined : "img",
    "aria-label": title === false ? undefined : (title ?? label),
    "aria-hidden": title === false ? true : undefined,
  };
  if (platform === "instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (platform === "facebook") {
    return (
      <svg {...common}>
        <path d="M17 3h-2.6A4.4 4.4 0 0 0 10 7.4V10H7.5v3.6H10V21h3.6v-7.4h2.6l.6-3.6h-3.2V7.8c0-.6.4-1 1-1H17z" />
      </svg>
    );
  }
  if (platform === "tiktok") {
    return (
      <svg {...common}>
        <path d="M14.5 3v11.6a3.4 3.4 0 1 1-3.4-3.4" />
        <path d="M14.5 3c.4 2.6 2.2 4.4 5 4.7" />
      </svg>
    );
  }
  return (
    <span className={cx("inline-flex h-4 min-w-4 items-center justify-center rounded bg-sunken px-0.5 text-[9px] font-bold uppercase", className)} aria-label={title === false ? undefined : label}>
      {label.slice(0, 2)}
    </span>
  );
}

export function PlatformGlyphs({ platforms, className }: { platforms: string[]; className?: string }) {
  const uniq = [...new Set(platforms)];
  if (uniq.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={uniq.map((p) => PLATFORM_LABEL[p] ?? p).join(", ")} role="img">
      {uniq.map((p) => (
        <PlatformGlyph key={p} platform={p} className={className} title={false} />
      ))}
    </span>
  );
}
