import type { MontageStatus } from "@/lib/shared/types";

/** Couleur de la pastille de statut d'un montage (toujours accompagnée de son libellé). */
export const STATUS_TONE: Record<MontageStatus, "neutral" | "honey" | "olive" | "terracotta"> = {
  draft: "neutral",
  rendering: "honey",
  rendered: "olive",
  failed: "terracotta",
};
