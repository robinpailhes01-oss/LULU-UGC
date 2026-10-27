"use client";

import { CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SkillDiff, type ComparableSkill } from "@/components/skills/DiffView";

/** Comparaison entre le skill dans l'Atelier et la version plus récente du dépôt. */
export function CompareRepoDialog({ open, onClose, current, repo, onRecover }: { open: boolean; onClose: () => void; current: ComparableSkill; repo: ComparableSkill | null; onRecover: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Comparer avec la version du dépôt"
      description="Lignes « − » : seulement dans l'Atelier. Lignes « + » : ce qu'apporte le dépôt."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="accent" icon={<CloudDownload className="h-4 w-4" />} onClick={onRecover} disabled={!repo}>
            Récupérer la version du dépôt
          </Button>
        </>
      }
    >
      <div className="p-4 sm:p-5">
        {repo ? <SkillDiff a={current} b={repo} aLabel="Dans l'Atelier (actuel)" bLabel="Dans le dépôt" /> : <p className="text-[13px] text-muted">La version du dépôt n'est pas disponible.</p>}
      </div>
    </Dialog>
  );
}
