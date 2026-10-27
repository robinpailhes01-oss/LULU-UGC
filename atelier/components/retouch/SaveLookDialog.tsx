"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Field";
import { api, errorMessage } from "@/lib/client/api";
import { lookParamsOf } from "@/lib/shared/look";
import type { Look, RetouchParams } from "@/lib/shared/types";

/** « Enregistrer comme look… » : nomme les réglages de lumière, couleur et effets courants. */
export function SaveLookDialog({ open, onClose, params, onSaved, suggestion }: { open: boolean; onClose: () => void; params: RetouchParams; onSaved: (look: Look) => void; suggestion?: string }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(suggestion ?? "");
      setError(null);
      setSaving(false);
    }
  }, [open, suggestion]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setError("Donnez un nom au look.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const look = await api.post<Look>("/api/looks", { name: n, params: lookParamsOf(params) });
      onSaved(look);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Enregistrer comme look" description="Lumière, couleur et effets actuels, réutilisables sur toutes les photos. Le recadrage n'est pas inclus." size="sm">
      <form onSubmit={submit} className="px-5 pb-4 pt-4">
        <Label htmlFor="rt-look-name">Nom du look</Label>
        <Input
          id="rt-look-name"
          autoFocus
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Terrasse du soir"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "rt-look-error" : undefined}
        />
        {error ? (
          <p id="rt-look-error" role="alert" className="mt-2 text-[12.5px] text-terracotta">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
