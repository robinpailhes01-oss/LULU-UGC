"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogOut, Menu as MenuIcon, Search, Sparkles, X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useMenu } from "@/components/ui/Menu";
import { useShell } from "@/components/shell/ShellContext";
import { api } from "@/lib/client/api";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { actor, agentOpen, toggleAgent, setSidebarOpen } = useShell();
  const menu = useMenu();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(pathname.startsWith("/mediatheque/recherche") ? params.get("q") ?? "" : "");

  useEffect(() => {
    if (pathname.startsWith("/mediatheque/recherche")) setQ(params.get("q") ?? "");
  }, [pathname, params]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas/95 px-3 backdrop-blur sm:px-4">
      <IconButton label="Ouvrir la navigation" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
        <MenuIcon className="h-5 w-5" />
      </IconButton>
      <form
        role="search"
        className="relative flex max-w-2xl flex-1 items-center"
        onSubmit={(e) => {
          e.preventDefault();
          const v = q.trim();
          router.push(v ? `/mediatheque/recherche?q=${encodeURIComponent(v)}` : "/mediatheque");
        }}
      >
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-faint" aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher : piscine, petit-déjeuner, Gîte de l'Abric…"
          aria-label="Rechercher dans la médiathèque"
          className="h-10 w-full rounded-full border border-transparent bg-sunken pl-10 pr-10 text-[14px] placeholder:text-faint focus:border-line-strong focus:bg-surface focus:outline-none"
        />
        {q ? (
          <button type="button" aria-label="Effacer" className="absolute right-3 rounded-full p-1 text-faint hover:text-ink" onClick={() => { setQ(""); inputRef.current?.focus(); }}>
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-4 hidden font-sans text-2xs text-faint sm:block">/</kbd>
        )}
      </form>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleAgent}
          aria-pressed={agentOpen}
          title="Agent (Ctrl+J)"
          className={cx(
            "flex h-9 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors",
            agentOpen ? "bg-ink text-surface" : "bg-surface text-ink shadow-card hover:shadow-pop",
          )}
        >
          <Sparkles className={cx("h-4 w-4", agentOpen ? "text-honey" : "text-chestnut")} />
          <span className="hidden sm:inline">Agent</span>
        </button>
        <button
          type="button"
          onClick={(e) =>
            menu.openBelow(
              e.currentTarget,
              [
                {
                  label: "Se déconnecter",
                  icon: <LogOut />,
                  onSelect: async () => {
                    await api.post("/api/auth/logout");
                    window.location.href = "/login";
                  },
                },
              ],
              "right",
            )
          }
          aria-label={actor ? `Connecté en tant que ${actor}` : "Compte"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-chestnut text-[13px] font-semibold text-surface"
        >
          {(actor ?? "?").slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
