"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Search, Users } from "lucide-react";
import { ClientAvatar } from "@/components/clients/ClientAvatar";
import { useShell } from "@/components/shell/ShellContext";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/client/api";

type Option = { key: string; kind: "all" | "client" | "new" | "manage"; id: string | null; label: string; sub?: string };

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Sélecteur du client courant (haut de la barre latérale) : recherche, « Tous les clients »,
 * les clients actifs, « Nouveau client ». Changer de client recharge toutes les vues.
 */
export function ClientSwitcher() {
  const { client, clients, clientsLoaded, switchClient, setNewClientOpen, setSidebarOpen } = useShell();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = "client-switcher-list";

  const options = useMemo<Option[]>(() => {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    const match = (s: string) => words.every((w) => norm(s).includes(w));
    const list: Option[] = [];
    if (!words.length || match("tous les clients")) list.push({ key: "all", kind: "all", id: null, label: "Tous les clients", sub: "Vue de l'agence" });
    for (const c of clients) if (!words.length || match(`${c.name} ${c.sector}`)) list.push({ key: c.id, kind: "client", id: c.id, label: c.name, sub: c.sector || undefined });
    list.push({ key: "new", kind: "new", id: null, label: "Nouveau client" });
    list.push({ key: "manage", kind: "manage", id: null, label: "Tous les clients et archives" });
    return list;
  }, [clients, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const i = client ? clients.findIndex((c) => c.id === client.id) + 1 : 0;
    setActive(Math.max(0, i));
    requestAnimationFrame(() => input.current?.focus());
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  async function choose(o: Option) {
    setOpen(false);
    button.current?.focus();
    if (o.kind === "new") {
      setNewClientOpen(true);
      return;
    }
    if (o.kind === "manage") {
      setSidebarOpen(false);
      router.push("/clients");
      return;
    }
    if ((client?.id ?? null) === o.id) return;
    setBusy(true);
    try {
      await switchClient(o.id);
      toast(o.id ? `Client : ${o.label}` : "Tous les clients");
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[Math.min(active, options.length - 1)];
      if (o) void choose(o);
    }
  }

  const current = client ? { name: client.name, color: client.color } : null;

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Client courant : ${client ? client.name : "Tous les clients"}. Changer de client`}
        className={cx("flex h-12 w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-2.5 text-left shadow-card transition-shadow hover:shadow-pop", busy && "opacity-70")}
      >
        <ClientAvatar client={current} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-muted">Client</span>
          <span className="block truncate text-[13.5px] font-semibold text-ink">{client ? client.name : "Tous les clients"}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-menu animate-fade-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop" onKeyDown={onKey}>
          <div className="relative border-b border-line p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
            <input
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              placeholder="Chercher un client"
              aria-label="Chercher un client"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={options[active] ? `cs-${options[active].key}` : undefined}
              className="h-8 w-full rounded-lg bg-sunken pl-7 pr-2 text-[13px] placeholder:text-faint focus:outline-none focus-visible:outline-none"
            />
          </div>
          {!clientsLoaded ? <p className="px-3 pt-2 text-[12.5px] text-muted">Chargement des clients…</p> : null}
          <ul id={listId} role="listbox" aria-label="Clients" className="max-h-[min(60vh,360px)] overflow-y-auto p-1">
            {options.map((o, i) => {
              const selected = o.kind === "all" ? !client : o.kind === "client" && client?.id === o.id;
              const c = o.kind === "client" ? clients.find((x) => x.id === o.id) : null;
              return (
                <li
                  key={o.key}
                  id={`cs-${o.key}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void choose(o)}
                  className={cx(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px]",
                    active === i && "bg-hover",
                    (o.kind === "new" || o.kind === "manage") && "text-ink",
                    o.kind === "new" && "mt-1 border-t border-line pt-2",
                  )}
                >
                  {o.kind === "all" ? <ClientAvatar client={null} size="sm" /> : null}
                  {c ? <ClientAvatar client={c} size="sm" /> : null}
                  {o.kind === "new" ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-select text-chestnut">
                      <Plus className="h-4 w-4" aria-hidden />
                    </span>
                  ) : null}
                  {o.kind === "manage" ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-muted">
                      <Users className="h-4 w-4" aria-hidden />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className={cx("block truncate", o.kind === "new" ? "font-semibold text-chestnut" : selected ? "font-semibold" : "")}>{o.label}</span>
                    {o.sub ? <span className="block truncate text-2xs text-muted">{o.sub}</span> : null}
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-chestnut" aria-hidden /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
