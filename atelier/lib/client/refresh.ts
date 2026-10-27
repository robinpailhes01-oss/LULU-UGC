"use client";

import { useEffect, useRef } from "react";
import type { RefreshScope } from "@/lib/shared/types";

/**
 * Petit bus d'événements : quand l'agent (ou un autre écran) modifie des données, il annonce
 * les zones touchées et chaque vue concernée se recharge. Aucun état global à synchroniser.
 */
const EVENT = "atelier:refresh";

export function emitRefresh(...scopes: RefreshScope[]) {
  if (typeof window === "undefined" || scopes.length === 0) return;
  window.dispatchEvent(new CustomEvent<RefreshScope[]>(EVENT, { detail: scopes }));
}

export function useRefresh(scopes: RefreshScope[], callback: () => void) {
  const cb = useRef(callback);
  cb.current = callback;
  const key = scopes.join(",");
  useEffect(() => {
    const wanted = new Set(key.split(",") as RefreshScope[]);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RefreshScope[]>).detail ?? [];
      if (detail.some((s) => wanted.has(s))) cb.current();
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [key]);
}
