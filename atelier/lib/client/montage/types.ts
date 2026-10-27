/**
 * Types échangés par l'API /api/montages (isomorphes : serveur, éditeur et agent).
 * Montage (lib/shared/types) reste le contrat ; ces types l'enrichissent sans le modifier.
 */
import type { Asset, Montage } from "@/lib/shared/types";
import type { RoleAssignment, MontageTiming } from "@/lib/client/montage/timing";
import type { Pacing, StyleIssue, TextAnimation, TextPlacement } from "@/lib/client/montage/style";

/** Ce que le style choisi attend du montage : guide affiché dans l'éditeur et lu par l'agent. */
export interface StyleGuide {
  slug: string;
  /** false si le style n'existe plus (supprimé, désactivé ou d'un autre type). */
  found: boolean;
  name: string;
  description: string;
  summary: string;
  pacing: Pacing;
  targetDurationS: { min: number; max: number } | null;
  textPlacement: TextPlacement;
  textAnimation: TextAnimation;
  captions: boolean;
  musicMood: string | null;
  look: string | null;
  /** Déroulé type, chaque rôle avec les plans qui le remplissent actuellement. */
  structure: RoleAssignment[];
  /** Paramètres invalides du style (ignorés). */
  issues: StyleIssue[];
  /** Le style fournit son propre modèle de composition (template.html). */
  hasTemplate: boolean;
}

export interface MontageDetail extends Montage {
  /** Médias utilisés (plans et musique), y compris ceux mis à la corbeille. */
  assets: Record<string, Asset>;
  timing: MontageTiming;
  styleGuide: StyleGuide | null;
}

export interface MontageCard extends Montage {
  coverUrl: string | null;
  styleName: string | null;
  clipCount: number;
}

export interface LintFinding {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  fixHint?: string;
  elementId?: string;
  selector?: string;
  line?: number;
  source: "hyperframes" | "atelier";
}

export interface LintReport {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  findings: LintFinding[];
}
