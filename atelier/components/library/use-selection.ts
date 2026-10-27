"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Asset } from "@/lib/shared/types";

const EMPTY: ReadonlySet<string> = new Set();

/** Sélection façon Drive : clic, Ctrl/Cmd + clic, Maj + clic (plage), tout, rien. */
export function useSelection(items: Asset[]) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(EMPTY);
  const anchor = useRef<string | null>(null);
  const indexById = useMemo(() => new Map(items.map((a, i) => [a.id, i])), [items]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Retire de la sélection les médias qui ne sont plus affichés (corbeille, déplacement…).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (indexById.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [indexById]);

  const selectOnly = useCallback((id: string) => {
    anchor.current = id;
    setSelected(new Set([id]));
  }, []);

  const toggle = useCallback((id: string) => {
    anchor.current = id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const range = useCallback(
    (toId: string, additive: boolean) => {
      const list = itemsRef.current;
      const from = anchor.current ? indexById.get(anchor.current) : undefined;
      const to = indexById.get(toId);
      if (to === undefined) return;
      const start = Math.min(from ?? to, to);
      const end = Math.max(from ?? to, to);
      setSelected((prev) => {
        const next = additive ? new Set(prev) : new Set<string>();
        for (let i = start; i <= end; i++) next.add(list[i].id);
        return next;
      });
      if (from === undefined) anchor.current = toId;
    },
    [indexById],
  );

  const all = useCallback(() => setSelected(new Set(itemsRef.current.map((a) => a.id))), []);
  const clear = useCallback(() => setSelected((prev) => (prev.size ? EMPTY : prev)), []);
  const set = useCallback((ids: string[]) => setSelected(new Set(ids)), []);

  const selectedAssets = useMemo(() => items.filter((a) => selected.has(a.id)), [items, selected]);

  return { selected, selectedAssets, selectOnly, toggle, range, all, clear, set, anchor, indexById };
}
