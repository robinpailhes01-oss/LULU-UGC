"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/components/ui/cx";

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Contexte non sécurisé (http sur le réseau local) : repli sur une zone de texte temporaire.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Bouton « Copier » discret (icône seule ou avec libellé). */
export function CopyButton({ text, label, className, children }: { text: string; label: string; className?: string; children?: React.ReactNode }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        const ok = await copyText(text);
        if (ok) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } else toast("Copie impossible : sélectionnez le texte à la main.", { tone: "error" });
      }}
      className={cx("relative inline-flex shrink-0 items-center gap-1.5 rounded-full text-muted transition-colors hover:bg-hover hover:text-ink", children ? "h-7 px-2.5 text-[12px] font-semibold" : "h-7 w-7 justify-center", className)}
    >
      {done ? <Check className="h-3.5 w-3.5 text-olive" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {children}
      <span className="sr-only" aria-live="polite">
        {done ? "Copié" : ""}
      </span>
    </button>
  );
}
