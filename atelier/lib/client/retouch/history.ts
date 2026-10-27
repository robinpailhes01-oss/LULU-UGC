"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Historique annuler / rétablir. `set` modifie l'état en direct (glissement d'un curseur) sans
 * créer d'étape ; `commit` fige l'étape (relâchement). `undo` fige d'abord un geste en cours.
 */
export interface History<T> {
  value: T;
  set: (next: T | ((prev: T) => T)) => void;
  commit: (next?: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  reset: (value: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

const LIMIT = 100;

export function useHistory<T>(initial: T, equal: (a: T, b: T) => boolean): History<T> {
  const [state, setState] = useState<{ past: T[]; present: T; future: T[]; committed: T }>(() => ({ past: [], present: initial, future: [], committed: initial }));
  const eq = useRef(equal);
  eq.current = equal;

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState((s) => {
      const value = typeof next === "function" ? (next as (p: T) => T)(s.present) : next;
      return eq.current(value, s.present) ? s : { ...s, present: value };
    });
  }, []);

  const commit = useCallback((next?: T | ((prev: T) => T)) => {
    setState((s) => {
      const value = next === undefined ? s.present : typeof next === "function" ? (next as (p: T) => T)(s.present) : next;
      if (eq.current(value, s.committed)) return { ...s, present: value };
      return { past: [...s.past, s.committed].slice(-LIMIT), present: value, future: [], committed: value };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      // Un geste non figé compte comme une étape : on revient à la dernière étape figée.
      if (!eq.current(s.present, s.committed)) return { past: s.past, present: s.committed, future: [s.present, ...s.future].slice(0, LIMIT), committed: s.committed };
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future].slice(0, LIMIT), committed: prev };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const [next, ...rest] = s.future;
      return { past: [...s.past, s.committed].slice(-LIMIT), present: next, future: rest, committed: next };
    });
  }, []);

  const reset = useCallback((value: T) => setState({ past: [], present: value, future: [], committed: value }), []);

  return {
    value: state.present,
    set,
    commit,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0 || !equal(state.present, state.committed),
    canRedo: state.future.length > 0,
  };
}
