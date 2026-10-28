"use client";

import Link from "next/link";
import { ClientAvatar } from "@/components/clients/ClientAvatar";
import { useShell } from "@/components/shell/ShellContext";
import { cx } from "@/components/ui/cx";

/**
 * Petite pastille d'en-tête : à quel client l'écran est limité (ou « Tous les clients »).
 * Un clic ouvre la fiche du client.
 */
export function ClientScopeChip({ className }: { className?: string }) {
  const { client } = useShell();
  const base = "inline-flex h-7 max-w-[240px] items-center gap-1.5 rounded-full border border-line bg-surface pl-0.5 pr-2.5 text-[12.5px] font-semibold text-ink";
  if (!client) {
    return (
      <span className={cx(base, "pl-1 text-muted", className)} title="Cet écran montre le contenu de tous les clients">
        <ClientAvatar client={null} size="xs" />
        Tous les clients
      </span>
    );
  }
  return (
    <Link href={`/clients/${client.id}`} className={cx(base, "hover:bg-hover", className)} title={`Limité au client « ${client.name} » — ouvrir sa fiche`}>
      <ClientAvatar client={client} size="xs" className="ml-0.5" />
      <span className="truncate">{client.name}</span>
      {client.status === "archived" ? <span className="font-normal text-muted">· archivé</span> : null}
    </Link>
  );
}
