"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/components/ui/cx";
import { topLayer } from "@/components/ui/layer";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export type MenuEntry = MenuItem | "separator";

interface OpenMenu {
  x: number;
  y: number;
  items: MenuEntry[];
}

const Ctx = createContext<{ open: (m: OpenMenu) => void; close: () => void } | null>(null);

/** Fournit un menu contextuel unique pour toute l'application. */
export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const close = useCallback(() => setMenu(null), []);
  return (
    <Ctx.Provider value={{ open: setMenu, close }}>
      {children}
      {menu ? <MenuSurface menu={menu} onClose={close} /> : null}
    </Ctx.Provider>
  );
}

export function useMenu() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMenu doit être utilisé dans <MenuProvider>");
  return {
    /** Ouvre le menu à la position d'un clic droit. */
    openAt: (e: { clientX: number; clientY: number; preventDefault?: () => void }, items: MenuEntry[]) => {
      e.preventDefault?.();
      ctx.open({ x: e.clientX, y: e.clientY, items });
    },
    /** Ouvre le menu sous un bouton. */
    openBelow: (el: HTMLElement, items: MenuEntry[], align: "left" | "right" = "left") => {
      const r = el.getBoundingClientRect();
      ctx.open({ x: align === "left" ? r.left : r.right, y: r.bottom + 4, items: align === "right" ? items : items });
    },
    close: ctx.close,
  };
}

function MenuSurface({ menu, onClose }: { menu: OpenMenu; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });
  const [active, setActive] = useState(-1);
  const items = menu.items;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(menu.x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(menu.y, window.innerHeight - r.height - 8)),
    });
    el.focus();
  }, [menu.x, menu.y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onScroll);
    };
  }, [onClose]);

  const selectable = items.map((it, i) => (it !== "separator" && !it.disabled ? i : -1)).filter((i) => i >= 0);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const idx = selectable.indexOf(active);
          const next = e.key === "ArrowDown" ? selectable[(idx + 1) % selectable.length] : selectable[(idx - 1 + selectable.length) % selectable.length];
          setActive(next ?? -1);
        }
        if (e.key === "Enter" && active >= 0) {
          const it = items[active];
          if (it !== "separator") {
            onClose();
            it.onSelect();
          }
        }
      }}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-menu min-w-[200px] animate-fade-in rounded-xl border border-line bg-surface p-1 shadow-pop outline-none"
    >
      {items.map((it, i) =>
        it === "separator" ? (
          <div key={`s${i}`} className="my-1 h-px bg-line" />
        ) : (
          <button
            key={`${it.label}${i}`}
            role="menuitem"
            type="button"
            disabled={it.disabled}
            onMouseEnter={() => setActive(i)}
            onClick={() => {
              onClose();
              it.onSelect();
            }}
            className={cx(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] disabled:opacity-40",
              it.danger ? "text-terracotta" : "text-ink",
              active === i && "bg-hover",
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center text-muted [&>svg]:h-4 [&>svg]:w-4">{it.icon}</span>
            <span className="flex-1">{it.label}</span>
            {it.shortcut ? <kbd className="font-sans text-2xs text-faint">{it.shortcut}</kbd> : null}
          </button>
        ),
      )}
    </div>,
    topLayer(),
  );
}
