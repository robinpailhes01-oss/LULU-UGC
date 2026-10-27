"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client/api";
import { useRefresh } from "@/lib/client/refresh";
import type { RefreshScope } from "@/lib/shared/types";

export interface Resource<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** Recharge depuis le serveur (sans effacer les données affichées). */
  reload: () => Promise<void>;
  /** Met à jour localement (optimiste), sans requête. */
  mutate: (updater: T | ((prev: T | undefined) => T)) => void;
}

/**
 * Charge une ressource JSON et la recharge quand une des zones `scopes` est annoncée.
 * `path` à null : rien n'est chargé (ressource conditionnelle).
 */
export function useResource<T>(path: string | null, scopes: RefreshScope[] = []): Resource<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(path));
  const current = useRef(path);
  current.current = path;

  const load = useCallback(async () => {
    const p = current.current;
    if (!p) return;
    setLoading(true);
    try {
      const out = await api.get<T>(p);
      if (current.current === p) {
        setData(out);
        setError(null);
      }
    } catch (err) {
      if (current.current === p) setError(errorMessage(err));
    } finally {
      if (current.current === p) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    void load();
  }, [path, load]);

  useRefresh(scopes, () => void load());

  const mutate = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setData((prev) => (typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater));
  }, []);

  return { data, error, loading, reload: load, mutate };
}
