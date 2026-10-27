"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useShell } from "@/components/shell/ShellContext";
import type { AgentScreenContext } from "@/lib/shared/types";

/** Contexte d'écran envoyé à l'agent, complété par l'adresse de la page. */
export type AgentScreen = AgentScreenContext & { path?: string };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Le contexte déclaré par l'écran (useScreenContext), complété depuis l'adresse quand l'écran
 * ne l'a pas précisé : dossier ouvert, montage, skill, photo en retouche.
 */
export function effectiveScreen(screen: AgentScreenContext, pathname: string): AgentScreen {
  const s: AgentScreen = { ...screen, path: pathname };
  const folder = new RegExp(`^/mediatheque/dossier/(${UUID})`, "i").exec(pathname)?.[1];
  if (folder && !s.folderId) s.folderId = folder;
  const montage = new RegExp(`^/montage/(${UUID})`, "i").exec(pathname)?.[1];
  if (montage && !s.montageId) s.montageId = montage;
  const skill = /^\/skills\/([^/?#]+)/.exec(pathname)?.[1];
  if (skill && !s.skillSlug) s.skillSlug = decodeURIComponent(skill);
  const photo = new RegExp(`^/retouche/(${UUID})`, "i").exec(pathname)?.[1];
  if (photo && !s.selectedAssetIds?.length) s.selectedAssetIds = [photo];
  return s;
}

export function useAgentScreen(): AgentScreen {
  const { screen } = useShell();
  const pathname = usePathname();
  return useMemo(() => effectiveScreen(screen, pathname), [screen, pathname]);
}
