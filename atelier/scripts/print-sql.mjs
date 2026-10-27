#!/usr/bin/env node
/** Affiche le SQL de toutes les migrations (à coller dans l'éditeur SQL de Supabase si besoin). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "lib/server/db/migrations.ts"), "utf8");
const re = /version: "([^"]+)",\s*sql: `([\s\S]*?)`,/g;
console.log("create schema if not exists atelier;\ncreate table if not exists atelier.schema_migrations (version text primary key, applied_at timestamptz not null default now());\n");
for (const m of src.matchAll(re)) {
  console.log(`-- ${m[1]}\n${m[2].trim()}\ninsert into atelier.schema_migrations (version) values ('${m[1]}') on conflict do nothing;\n`);
}
