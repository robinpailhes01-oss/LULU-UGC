"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { useTopLayer } from "@/components/ui/layer";

type Tone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
}

const Ctx = createContext<((message: string, opts?: { tone?: Tone; action?: ToastItem["action"]; durationMs?: number }) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (message: string, opts: { tone?: Tone; action?: ToastItem["action"]; durationMs?: number } = {}) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-3), { id, message, tone: opts.tone ?? "success", action: opts.action }]);
      window.setTimeout(() => dismiss(id), opts.durationMs ?? (opts.tone === "error" ? 7000 : 4000));
    },
    [dismiss],
  );
  const layer = useTopLayer();
  const stackEl = (
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-toast flex w-[min(440px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex animate-rise-in items-center gap-3 rounded-xl bg-ink px-4 py-3 text-[13.5px] text-surface shadow-pop">
            {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#c7d3a8]" /> : t.tone === "error" ? <AlertTriangle className="h-4 w-4 shrink-0 text-[#f0b49c]" /> : <Info className="h-4 w-4 shrink-0 text-honey" />}
            <span className="flex-1">{t.message}</span>
            {t.action ? (
              <button type="button" className="font-semibold text-honey hover:underline" onClick={() => { dismiss(t.id); t.action!.onClick(); }}>
                {t.action.label}
              </button>
            ) : null}
            <button type="button" aria-label="Fermer" className={cx("rounded-full p-0.5 text-surface/60 hover:text-surface")} onClick={() => dismiss(t.id)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
  );
  return (
    <Ctx.Provider value={push}>
      {children}
      {layer ? createPortal(stackEl, layer) : null}
    </Ctx.Provider>
  );
}

/** toast("Déplacé dans « Gîte de l'Abric »", { action: { label: "Annuler", onClick } }) */
export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return ctx;
}
