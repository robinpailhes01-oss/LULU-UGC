#!/usr/bin/env node
/**
 * Rapatrie dans le dépôt les skills tels qu'ils sont dans un Atelier en ligne (améliorations
 * faites par l'équipe ou l'agent), pour les relire, les committer et les partager.
 *
 *   ATELIER_URL=https://atelier.example.com ATELIER_PASSWORD=… npm run skills:pull
 *   options : --only=slug1,slug2   --include-app (ajoute aussi les skills créés dans l'Atelier)
 *
 * Écrit dans atelier/skills/<slug>/ puis régénère le module embarqué. Relisez le diff avant de committer.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.env.ATELIER_URL || "http://localhost:3100").replace(/\/$/, "");
const password = process.env.ATELIER_PASSWORD || "";
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const includeApp = process.argv.includes("--include-app");

async function main() {
  let cookie = "";
  if (password) {
    const res = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Dépôt", password }) });
    if (!res.ok) throw new Error(`Connexion refusée (${res.status})`);
    cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  }
  const res = await fetch(`${base}/api/skills/export`, { headers: cookie ? { cookie } : {} });
  if (!res.ok) throw new Error(`Export impossible (${res.status}) : ${await res.text()}`);
  const { skills } = await res.json();
  let written = 0;
  for (const s of skills) {
    if (only.length && !only.includes(s.slug)) continue;
    if (s.source === "app" && !includeApp) continue;
    const dir = path.join(root, "skills", s.slug);
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(s.files)) {
      if (name.includes("/") || name.includes("..")) continue;
      fs.writeFileSync(path.join(dir, name), content);
    }
    written++;
    console.log(`✓ ${s.slug} (v${s.version}${s.enabled ? "" : ", désactivé"})`);
  }
  execFileSync(process.execPath, [path.join(root, "scripts/bundle-skills.mjs")], { stdio: "inherit" });
  console.log(`${written} skill(s) écrit(s) dans atelier/skills/. Relisez avec « git diff » avant de committer.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
