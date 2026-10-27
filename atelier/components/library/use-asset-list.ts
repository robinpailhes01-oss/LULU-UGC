"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage, qs } from "@/lib/client/api";
import { useRefresh } from "@/lib/client/refresh";
import type { Asset, AssetKind, AssetPage, AssetSort } from "@/lib/shared/types";

/** Paramètres de GET /api/assets utilisés par la médiathèque. */
export interface ListQuery {
  folder?: string;
  q?: string;
  kind?: AssetKind;
  tags?: string[];
  starred?: boolean;
  trashed?: boolean;
  untagged?: boolean;
  sort?: AssetSort;
}

export interface AssetList {
  items: Asset[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  /** Première réponse reçue pour la requête courante. */
  ready: boolean;
  hasMore: boolean;
  reload: () => void;
  loadMore: () => Promise<void>;
  /** Mise à jour locale optimiste (avant la confirmation du serveur). */
  mutate: (fn: (items: Asset[]) => Asset[]) => void;
}

const SERVER_MAX = 1000;

/**
 * Liste paginée de médias (« Afficher plus » par pages de `pageSize`), rechargée quand la zone
 * « assets » est annoncée (emitRefresh). Les rechargements rapprochés sont regroupés et les objets
 * inchangés (même id, même updatedAt) sont conservés, pour que les cartes mémoïsées ne se
 * redessinent pas toutes à chaque import.
 */
export function useAssetList(query: ListQuery | null, opts: { pageSize?: number; maxItems?: number } = {}): AssetList {
  const pageSize = opts.pageSize ?? 200;
  const maxItems = opts.maxItems;
  const key = query ? qs({ ...query }) : null;
  const [state, setState] = useState({ items: [] as Asset[], total: 0, loading: Boolean(key), loadingMore: false, error: null as string | null, ready: false });
  const itemsRef = useRef<Asset[]>([]);
  const keyRef = useRef(key);
  const seq = useRef(0);
  const running = useRef(false);
  const again = useRef(false);

  const fetchRange = useCallback(async (base: string, offset: number, count: number) => {
    const chunks: Promise<AssetPage>[] = [];
    for (let o = offset; o < offset + count; o += SERVER_MAX) {
      const limit = Math.min(SERVER_MAX, offset + count - o);
      chunks.push(api.get<AssetPage>(`/api/assets${base}${base ? "&" : "?"}limit=${limit}&offset=${o}`));
    }
    const pages = await Promise.all(chunks);
    return { items: pages.flatMap((p) => p.items), total: pages[0]?.total ?? 0 };
  }, []);

  const load = useCallback(
    async (reset: boolean) => {
      const base = keyRef.current;
      if (base === null) return;
      const my = ++seq.current;
      running.current = true;
      setState((s) => ({ ...s, loading: true }));
      try {
        let want = reset ? pageSize : Math.max(pageSize, itemsRef.current.length);
        if (maxItems) want = Math.min(want, maxItems);
        const r = await fetchRange(base, 0, want);
        if (my !== seq.current) return;
        const merged = share(reset ? [] : itemsRef.current, r.items);
        itemsRef.current = merged;
        setState({ items: merged, total: maxItems ? Math.min(r.total, maxItems) : r.total, loading: false, loadingMore: false, error: null, ready: true });
      } catch (err) {
        if (my === seq.current) setState((s) => ({ ...s, loading: false, error: errorMessage(err), ready: true }));
      } finally {
        if (my === seq.current) {
          running.current = false;
          if (again.current) {
            again.current = false;
            void load(false);
          }
        }
      }
    },
    [fetchRange, pageSize, maxItems],
  );

  useEffect(() => {
    keyRef.current = key;
    if (key === null) return;
    void load(true);
  }, [key, load]);

  const reload = useCallback(() => {
    if (running.current) again.current = true;
    else void load(false);
  }, [load]);

  useRefresh(["assets"], reload);

  const loadMore = useCallback(async () => {
    const base = keyRef.current;
    if (base === null) return;
    const offset = itemsRef.current.length;
    const count = maxItems ? Math.min(pageSize, maxItems - offset) : pageSize;
    if (count <= 0) return;
    setState((s) => ({ ...s, loadingMore: true }));
    try {
      const r = await fetchRange(base, offset, count);
      if (keyRef.current !== base) return;
      const seen = new Set(itemsRef.current.map((a) => a.id));
      const next = [...itemsRef.current, ...r.items.filter((a) => !seen.has(a.id))];
      itemsRef.current = next;
      setState((s) => ({ ...s, items: next, total: maxItems ? Math.min(r.total, maxItems) : r.total, loadingMore: false }));
    } catch (err) {
      setState((s) => ({ ...s, loadingMore: false, error: errorMessage(err) }));
    }
  }, [fetchRange, pageSize, maxItems]);

  const mutate = useCallback((fn: (items: Asset[]) => Asset[]) => {
    const before = itemsRef.current;
    const after = fn(before);
    itemsRef.current = after;
    setState((s) => ({ ...s, items: after, total: Math.max(0, s.total - (before.length - after.length)) }));
  }, []);

  return { ...state, hasMore: state.items.length < state.total, reload, loadMore, mutate };
}

/** Partage structurel : réutilise l'objet précédent quand le média n'a pas changé. */
function share(prev: Asset[], next: Asset[]): Asset[] {
  if (prev.length === 0) return next;
  const byId = new Map(prev.map((a) => [a.id, a]));
  let same = prev.length === next.length;
  const out = next.map((a, i) => {
    const old = byId.get(a.id);
    const keep = old && old.updatedAt === a.updatedAt && old.status === a.status && old.trashedAt === a.trashedAt ? old : a;
    if (same && prev[i] !== keep) same = false;
    return keep;
  });
  return same ? prev : out;
}
