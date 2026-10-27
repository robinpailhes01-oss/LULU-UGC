"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Préférence d'affichage gardée dans le navigateur (grille/liste, tri, panneau Infos). */
export function usePref<T extends string | boolean>(key: string, initial: T, accept?: (v: unknown) => v is T): [T, (v: T) => void] {
  const storageKey = `atelier:library:${key}`;
  const [value, setValue] = useState<T>(initial);
  useIsoLayoutEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return;
      const parsed = JSON.parse(raw) as unknown;
      if (accept ? accept(parsed) : typeof parsed === typeof initial) setValue(parsed as T);
    } catch {
      /* stockage indisponible */
    }
  }, [storageKey]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(v));
      } catch {
        /* stockage indisponible */
      }
    },
    [storageKey],
  );
  return [value, set];
}

/** Vrai quand la requête média correspond (ex. « (min-width: 1024px) »). */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [match, setMatch] = useState(fallback);
  useIsoLayoutEffect(() => {
    const mq = window.matchMedia(query);
    setMatch(mq.matches);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}
