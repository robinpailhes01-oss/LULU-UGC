"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientAvatar } from "@/components/clients/ClientAvatar";
import { ColorField, draftToPayload, emptySocials, SectorField, SocialFields, socialErrors, type SocialDraft } from "@/components/clients/ClientForm";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { CLIENT_COLORS, normalizeWebsite } from "@/lib/shared/clients";
import type { Client } from "@/lib/shared/types";

/**
 * « Nouveau client » : nom, secteur, site, réseaux, description, couleur. À la création, le client
 * devient le client courant et sa fiche s'ouvre.
 */
export function NewClientDialog() {
  const { newClientOpen, setNewClientOpen, switchClient, reloadClients } = useShell();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(CLIENT_COLORS[0]);
  const [socials, setSocials] = useState<SocialDraft>(emptySocials());
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!newClientOpen) return;
    setName("");
    setSector("");
    setWebsite("");
    setDescription("");
    setColor(CLIENT_COLORS[Math.floor(Math.random() * CLIENT_COLORS.length)]);
    setSocials(emptySocials());
    setTouched(false);
  }, [newClientOpen]);

  const websiteError = useMemo(() => {
    if (!touched) return null;
    try {
      normalizeWebsite(website);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Adresse illisible.";
    }
  }, [website, touched]);

  const close = () => setNewClientOpen(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    if (Object.keys(socialErrors(socials)).length) return;
    try {
      normalizeWebsite(website);
    } catch {
      return;
    }
    setBusy(true);
    try {
      const client = await api.post<Client & { zernioWarning?: string }>("/api/clients", {
        name: name.trim(),
        sector: sector.trim(),
        website: website.trim() || null,
        description: description.trim(),
        color,
        socials: draftToPayload(socials),
      });
      close();
      await switchClient(client.id);
      await reloadClients();
      emitRefresh("clients", "folders");
      toast(`Client « ${client.name} » créé`);
      if (client.zernioWarning) toast(`Profil Zernio non créé : ${client.zernioWarning}`, { tone: "error" });
      router.push(`/clients/${client.id}`);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={newClientOpen}
      onClose={close}
      title="Nouveau client"
      description="Sa fiche, son dossier dans la médiathèque et ses réseaux. Tout reste modifiable ensuite."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" form="new-client-form" loading={busy} disabled={!name.trim()}>
            Créer le client
          </Button>
        </>
      }
    >
      <form id="new-client-form" onSubmit={submit} className="grid gap-5 px-5 py-5" noValidate>
        <div className="flex items-start gap-4">
          <ClientAvatar client={{ name: name.trim() || "?", color }} size="lg" className="mt-6 hidden sm:inline-flex" />
          <div className="min-w-0 flex-1">
            <Label htmlFor="nc-name">Nom du client</Label>
            <Input id="nc-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Le Comptoir du Port" maxLength={120} required aria-invalid={touched && !name.trim() ? true : undefined} />
            {touched && !name.trim() ? <p className="mt-1 text-[12px] text-terracotta">Donnez un nom au client.</p> : null}
          </div>
        </div>

        <div>
          <Label htmlFor="nc-sector" hint="saisie libre">
            Secteur
          </Label>
          <SectorField id="nc-sector" value={sector} onChange={setSector} />
        </div>

        <div>
          <Label htmlFor="nc-site">Site web</Label>
          <Input id="nc-site" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="lecomptoirduport.fr" inputMode="url" autoComplete="off" spellCheck={false} aria-invalid={websiteError ? true : undefined} />
          {websiteError ? <p className="mt-1 text-[12px] text-terracotta">{websiteError}</p> : null}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[12.5px] font-semibold text-ink">Réseaux sociaux</legend>
          <p className="mb-2.5 text-[12.5px] text-muted">Adresse du profil ou @identifiant. La connexion pour publier se fait ensuite depuis la fiche.</p>
          <SocialFields idPrefix="nc" value={socials} onChange={setSocials} showAll={touched} />
        </fieldset>

        <div>
          <Label htmlFor="nc-desc" hint="facultatif">
            Description courte
          </Label>
          <Textarea id="nc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bistrot de port à La Rochelle : cuisine de la mer, terrasse, clientèle locale et touristes." maxLength={2000} rows={3} />
        </div>

        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink">Couleur</p>
          <ColorField value={color} onChange={setColor} />
        </div>
      </form>
    </Dialog>
  );
}
