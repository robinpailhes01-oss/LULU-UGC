import { CloudDownload, EyeOff, FolderGit2, PenLine, Sparkle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { KindIcon } from "@/components/skills/KindIcon";
import { SKILL_KIND_LABEL, SKILL_KIND_TONE } from "@/lib/client/skills/kinds";
import type { Skill, SkillKind } from "@/lib/shared/types";

export function KindBadge({ kind }: { kind: SkillKind }) {
  return (
    <Badge tone={SKILL_KIND_TONE[kind]}>
      <KindIcon kind={kind} className="h-3 w-3" />
      {SKILL_KIND_LABEL[kind]}
    </Badge>
  );
}

/** Skill propre à un client (sinon : skill de l'agence, pour tous les clients). */
export function ClientSkillBadge({ clientName }: { clientName: string | null }) {
  return clientName ? (
    <Badge tone="chestnut" className="max-w-[180px]">
      <span className="truncate">Client : {clientName}</span>
    </Badge>
  ) : null;
}

export function SourceBadge({ source }: { source: Skill["source"] }) {
  return source === "repo" ? (
    <Badge tone="neutral" className="border border-line bg-transparent">
      <FolderGit2 className="h-3 w-3" aria-hidden />
      Dépôt
    </Badge>
  ) : (
    <Badge tone="neutral" className="border border-line bg-transparent">
      <Sparkle className="h-3 w-3" aria-hidden />
      Créé ici
    </Badge>
  );
}

/** Badges d'état : modifié ici, mise à jour du dépôt, désactivé. */
export function StateBadges({ skill }: { skill: Pick<Skill, "source" | "appEdited" | "repoUpdateAvailable" | "enabled"> }) {
  return (
    <>
      {skill.source === "repo" && skill.appEdited ? (
        <Badge tone="chestnut">
          <PenLine className="h-3 w-3" aria-hidden />
          Modifié ici
        </Badge>
      ) : null}
      {skill.repoUpdateAvailable ? (
        <Badge tone="honey">
          <CloudDownload className="h-3 w-3" aria-hidden />
          Mise à jour du dépôt
        </Badge>
      ) : null}
      {!skill.enabled ? (
        <Badge tone="neutral">
          <EyeOff className="h-3 w-3" aria-hidden />
          Désactivé
        </Badge>
      ) : null}
    </>
  );
}
