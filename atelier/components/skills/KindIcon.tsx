import { BookMarked, Clapperboard, Gem, ListChecks, MessageSquareQuote, Shapes, WandSparkles } from "lucide-react";
import type { SkillKind } from "@/lib/shared/types";

const ICONS: Record<SkillKind, typeof Clapperboard> = {
  montage: Clapperboard,
  voice: MessageSquareQuote,
  brand: Gem,
  workflow: ListChecks,
  references: BookMarked,
  retouch: WandSparkles,
  other: Shapes,
};

export function KindIcon({ kind, className }: { kind: SkillKind; className?: string }) {
  const Icon = ICONS[kind] ?? Shapes;
  return <Icon className={className ?? "h-4 w-4"} aria-hidden />;
}
