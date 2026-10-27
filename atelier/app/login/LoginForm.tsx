"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { cx } from "@/components/ui/cx";
import { api, errorMessage } from "@/lib/client/api";

export function LoginForm({ team, needsPassword, next }: { team: string[]; needsPassword: boolean; next: string }) {
  const [name, setName] = useState(team[0] ?? "");
  const [other, setOther] = useState(team.length === 0);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { name: name.trim(), password });
      window.location.href = next;
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-card bg-surface p-6 shadow-card">
      <div>
        <Label>Qui travaille ?</Label>
        <div className="flex flex-wrap gap-2">
          {team.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setName(t);
                setOther(false);
              }}
              className={cx("h-9 rounded-full border px-4 text-[13.5px] font-semibold", !other && name === t ? "border-chestnut bg-select text-chestnut" : "border-line hover:bg-hover")}
            >
              {t}
            </button>
          ))}
          <button type="button" onClick={() => { setOther(true); setName(""); }} className={cx("h-9 rounded-full border px-4 text-[13.5px]", other ? "border-chestnut bg-select text-chestnut" : "border-line hover:bg-hover")}>
            Autre
          </button>
        </div>
        {other ? <Input className="mt-2" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom" maxLength={40} aria-label="Votre prénom" /> : null}
      </div>
      {needsPassword ? (
        <div>
          <Label htmlFor="pw">Mot de passe de l&apos;atelier</Label>
          <Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus={!other} />
        </div>
      ) : (
        <p className="rounded-lg bg-honey-soft px-3 py-2 text-[12.5px] text-[#7a5220]">Mode local : aucun mot de passe n&apos;est défini (ATELIER_PASSWORD).</p>
      )}
      {error ? <p role="alert" className="text-[13px] text-terracotta">{error}</p> : null}
      <Button variant="primary" size="lg" type="submit" className="w-full" loading={busy} disabled={!name.trim() || (needsPassword && !password)}>
        Entrer dans l&apos;atelier
      </Button>
    </form>
  );
}
