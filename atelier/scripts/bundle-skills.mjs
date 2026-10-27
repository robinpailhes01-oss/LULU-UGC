#!/usr/bin/env node
/**
 * Regroupe les skills écrits dans atelier/skills/<slug>/ en un module TypeScript embarqué dans
 * l'application (lib/server/skills/bundled.generated.ts). Lancé automatiquement avant `dev` et
 * `build` ; à relancer à la main après avoir modifié un skill : `npm run skills:bundle`.
 *
 * Format d'un skill :
 *   skills/<slug>/SKILL.md     en-tête YAML simple (name, description, kind) + consignes Markdown
 *   skills/<slug>/data.json    paramètres structurés (facultatif ; style de montage, etc.)
 *   skills/<slug>/<autres>     fichiers texte annexes (.md, .html, .css, .txt, .json)
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(root, "skills");
const outFile = path.join(root, "lib/server/skills/bundled.generated.ts");
const KINDS = new Set(["montage", "voice", "brand", "workflow", "references", "retouch", "other"]);
const TEXT_EXT = new Set([".md", ".html", ".css", ".txt", ".json", ".svg"]);

/** En-tête YAML minimal : clé: valeur, clé: > (texte replié) ou clé: | (texte littéral), guillemets. */
export function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) return { meta: {}, body: src.trim() };
  const lines = m[1].split(/\r?\n/);
  const meta = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    let value = rawValue.trim();
    if (value === ">" || value === "|" || value === ">-" || value === "|-") {
      const block = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || lines[i + 1].trim() === "")) block.push(lines[++i].trim());
      value = value.startsWith(">") ? block.join(" ").replace(/\s+/g, " ").trim() : block.join("\n").trim();
    } else if (/^".*"$/.test(value) || /^'.*'$/.test(value)) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body: m[2].trim() };
}

/** JSON à clés triées : même empreinte quel que soit l'ordre des clés (jsonb les réordonne). */
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

/** Doit rester identique à skillContentHash() de lib/server/services/skills.ts. */
function hash(obj) {
  return createHash("sha256").update(canonical(obj)).digest("hex").slice(0, 16);
}

function bundle() {
  const skills = [];
  const problems = [];
  if (fs.existsSync(skillsDir)) {
    for (const slug of fs.readdirSync(skillsDir).sort()) {
      const dir = path.join(skillsDir, slug);
      if (!fs.statSync(dir).isDirectory()) continue;
      if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) {
        problems.push(`${slug} : nom de dossier invalide (minuscules, chiffres et tirets)`);
        continue;
      }
      const skillFile = path.join(dir, "SKILL.md");
      if (!fs.existsSync(skillFile)) {
        problems.push(`${slug} : SKILL.md manquant`);
        continue;
      }
      const { meta, body } = parseFrontmatter(fs.readFileSync(skillFile, "utf8"));
      const kind = KINDS.has(meta.kind) ? meta.kind : "other";
      if (!meta.name) problems.push(`${slug} : « name » manquant dans l'en-tête`);
      if (!meta.description) problems.push(`${slug} : « description » manquante dans l'en-tête`);
      let data = null;
      const files = {};
      for (const f of fs.readdirSync(dir).sort()) {
        if (f === "SKILL.md") continue;
        const full = path.join(dir, f);
        if (!fs.statSync(full).isFile() || !TEXT_EXT.has(path.extname(f).toLowerCase())) continue;
        const text = fs.readFileSync(full, "utf8");
        if (f === "data.json") {
          try {
            data = JSON.parse(text);
          } catch (e) {
            problems.push(`${slug}/data.json : JSON invalide (${e.message})`);
          }
        } else files[f] = text;
      }
      const content = { kind, name: meta.name ?? slug, description: meta.description ?? "", body, data, files };
      skills.push({ slug, ...content, hash: hash(content) });
    }
  }
  const header = `// Généré par scripts/bundle-skills.mjs depuis atelier/skills/ — ne pas modifier à la main.\n// Pour changer un skill : éditer atelier/skills/<slug>/ puis lancer \`npm run skills:bundle\`.\n`;
  const out = `${header}import type { BundledSkill } from "@/lib/server/skills/types";\n\nexport const BUNDLED_SKILLS: BundledSkill[] = ${JSON.stringify(skills, null, 2)};\n`;
  const prev = fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8") : "";
  if (prev !== out) fs.writeFileSync(outFile, out);
  for (const p of problems) console.warn(`[skills] ${p}`);
  console.log(`[skills] ${skills.length} skill(s) regroupé(s)${prev === out ? " (inchangé)" : ""}`);
  if (problems.length && process.argv.includes("--strict")) process.exit(1);
}

bundle();
