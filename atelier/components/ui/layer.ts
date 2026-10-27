"use client";

import { useSyncExternalStore } from "react";

/**
 * Pile des fenêtres modales ouvertes. Une <dialog> ouverte avec showModal() rend tout le reste
 * de la page inerte : les menus et les notifications doivent donc s'afficher DANS la modale
 * du dessus pour rester visibles et cliquables.
 */
const stack: HTMLElement[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function pushLayer(el: HTMLElement) {
  if (!stack.includes(el)) {
    stack.push(el);
    emit();
  }
}

export function popLayer(el: HTMLElement) {
  const i = stack.indexOf(el);
  if (i >= 0) {
    stack.splice(i, 1);
    emit();
  }
}

/** Élément où monter un menu ou une notification (modale du dessus, sinon <body>). */
export function topLayer(): HTMLElement {
  return stack[stack.length - 1] ?? document.body;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTopLayer(): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => (typeof document === "undefined" ? null : topLayer()),
    () => null,
  );
}
