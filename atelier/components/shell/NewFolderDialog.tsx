"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import type { Folder } from "@/lib/shared/types";

export function NewFolderDialog({ state, onClose }: { state: { parentId: string | null } | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state) setName("");
  }, [state]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const folder = await api.post<Folder>("/api/folders", { name: name.trim(), parentId: state?.parentId ?? null });
      emitRefresh("folders");
      toast(`Dossier « ${folder.name} » créé`);
      onClose();
      router.push(`/mediatheque/dossier/${folder.id}`);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(state)} onClose={onClose} title="Nouveau dossier" size="sm">
      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Gîte de l'Abric — octobre" maxLength={120} aria-label="Nom du dossier" />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" loading={busy} disabled={!name.trim()}>
            Créer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
