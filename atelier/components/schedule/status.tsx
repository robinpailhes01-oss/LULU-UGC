import { CalendarClock, CircleAlert, CircleCheck, CircleX, LoaderCircle, SquarePen } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { POST_STATUS_LABEL } from "@/lib/shared/labels";
import type { PostStatus, ScheduledPost } from "@/lib/shared/types";

/** Couleur d'état des publications : toujours accompagnée d'un libellé ou d'une icône nommée. */
export const STATUS_STYLE: Record<PostStatus, { chip: string; bar: string; badge: string; dot: string }> = {
  draft: { chip: "bg-sunken/80 text-ink", bar: "bg-faint", badge: "bg-sunken text-muted", dot: "bg-faint" },
  scheduled: { chip: "bg-plum-soft text-ink", bar: "bg-plum", badge: "bg-plum-soft text-plum", dot: "bg-plum" },
  publishing: { chip: "bg-honey-soft text-ink", bar: "bg-honey", badge: "bg-honey-soft text-[#7a5220]", dot: "bg-honey" },
  published: { chip: "bg-olive-soft text-ink", bar: "bg-olive", badge: "bg-olive-soft text-[#3f4b2c]", dot: "bg-olive" },
  failed: { chip: "bg-terracotta-soft text-ink", bar: "bg-terracotta", badge: "bg-terracotta-soft text-[#7f341d]", dot: "bg-terracotta" },
  cancelled: { chip: "bg-sunken/80 text-muted line-through", bar: "bg-faint", badge: "bg-sunken text-muted", dot: "bg-faint" },
};

const ICONS: Record<PostStatus, typeof SquarePen> = {
  draft: SquarePen,
  scheduled: CalendarClock,
  publishing: LoaderCircle,
  published: CircleCheck,
  failed: CircleAlert,
  cancelled: CircleX,
};

/** Libellé affiché : « Publié en partie » quand Zernio signale un échec sur un des comptes. */
export function statusLabel(post: Pick<ScheduledPost, "status" | "error">): string {
  if (post.status === "published" && post.error) return "Publié en partie";
  return POST_STATUS_LABEL[post.status];
}

export function StatusIcon({ status, className }: { status: PostStatus; className?: string }) {
  const Icon = ICONS[status];
  return <Icon className={cx("h-3 w-3 shrink-0", status === "publishing" && "motion-safe:animate-spin", className)} aria-hidden strokeWidth={2} />;
}

export function StatusBadge({ post, className }: { post: Pick<ScheduledPost, "status" | "error">; className?: string }) {
  const partial = post.status === "published" && post.error;
  return (
    <span className={cx("inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-2xs font-semibold", partial ? STATUS_STYLE.publishing.badge : STATUS_STYLE[post.status].badge, className)}>
      <StatusIcon status={post.status} />
      {statusLabel(post)}
    </span>
  );
}

export const LEGEND: PostStatus[] = ["draft", "scheduled", "publishing", "published", "failed"];
