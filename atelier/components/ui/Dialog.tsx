"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { popLayer, pushLayer } from "@/components/ui/layer";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  /** Fond sombre (lightbox, lecteur vidéo). */
  dark?: boolean;
}

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-5xl", full: "max-w-[min(1400px,96vw)] h-[92vh]" };

/** Fenêtre modale basée sur <dialog> (piège du focus et Échap natifs). */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", className, dark }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      pushLayer(el);
    }
    if (!open && el.open) el.close();
    if (!open) popLayer(el);
    return () => popLayer(el);
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        "z-modal w-[calc(100vw-24px)] overflow-hidden rounded-card p-0 shadow-pop backdrop:bg-night/45 backdrop:backdrop-blur-[2px] open:animate-rise-in",
        dark ? "bg-night text-surface" : "bg-surface text-ink",
        SIZES[size],
        className,
      )}
    >
      {open ? (
        <div className={cx("flex max-h-[90vh] flex-col", size === "full" && "h-full max-h-none")}>
          {title ? (
            <header className={cx("flex items-start justify-between gap-4 border-b px-5 py-4", dark ? "border-white/10" : "border-line")}>
              <div>
                <h2 className="text-[16px] font-semibold">{title}</h2>
                {description ? <p className={cx("mt-0.5 text-[13px]", dark ? "text-white/60" : "text-muted")}>{description}</p> : null}
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer" className={cx("rounded-full p-1.5", dark ? "hover:bg-white/10" : "text-muted hover:bg-hover hover:text-ink")}>
                <X className="h-4 w-4" />
              </button>
            </header>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          {footer ? <footer className={cx("flex items-center justify-end gap-2 border-t px-5 py-3", dark ? "border-white/10" : "border-line")}>{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}

/** Confirmation simple (suppression, publication…). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Confirmer",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="h-9 rounded-full px-3.5 text-[13.5px] font-semibold hover:bg-hover" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            disabled={loading}
            className={cx("h-9 rounded-full px-4 text-[13.5px] font-semibold text-surface disabled:opacity-60", danger ? "bg-terracotta hover:bg-[#8f3c22]" : "bg-ink hover:bg-[#3a2f26]")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {children ? <div className="px-5 py-4 text-[13.5px] leading-relaxed text-muted">{children}</div> : null}
    </Dialog>
  );
}
