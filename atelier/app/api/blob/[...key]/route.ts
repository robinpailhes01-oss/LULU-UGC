import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import { env } from "@/lib/server/env";
import { blobPath, openReadStream, readMeta, verifyBlob, writeStreamToKey, writeStreamToPart } from "@/lib/server/storage/local";

/**
 * Accès aux fichiers du stockage local (mode sans S3). Chaque URL porte une signature HMAC
 * à durée limitée générée par lib/server/storage/local.ts. Supporte les requêtes Range (vidéo).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ key: string[] }> };

function keyOf(parts: string[]) {
  return parts.map((p) => decodeURIComponent(p)).join("/");
}

function deny(message = "Lien invalide ou expiré.") {
  return NextResponse.json({ error: { code: "forbidden", message } }, { status: 403 });
}

export async function GET(req: Request, ctx: Ctx) {
  if (env.storage.kind !== "local") return deny("Stockage local désactivé.");
  const key = keyOf((await ctx.params).key);
  const sp = new URL(req.url).searchParams;
  if (sp.get("op") !== "get" || !verifyBlob("get", key, Number(sp.get("exp")), sp.get("sig") ?? "")) return deny();

  let file: string;
  let size: number;
  try {
    file = blobPath(key);
    size = (await fs.stat(file)).size;
  } catch {
    return NextResponse.json({ error: { code: "not_found", message: "Fichier introuvable." } }, { status: 404 });
  }
  const contentType = (await readMeta(file)).contentType ?? "application/octet-stream";
  const headers = new Headers({
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });
  const dl = sp.get("dl");
  if (dl) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(dl)}`);

  const range = req.headers.get("range");
  const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : Math.max(size - Number(m[2]), 0);
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    if (start >= size || start > end) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    end = Math.min(end, size - 1);
    start = Math.max(start, 0);
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new NextResponse(Readable.toWeb(openReadStream(key, { start, end })) as ReadableStream, { status: 206, headers });
  }
  headers.set("Content-Length", String(size));
  return new NextResponse(Readable.toWeb(openReadStream(key)) as ReadableStream, { status: 200, headers });
}

export async function PUT(req: Request, ctx: Ctx) {
  if (env.storage.kind !== "local") return deny("Stockage local désactivé.");
  const key = keyOf((await ctx.params).key);
  const sp = new URL(req.url).searchParams;
  const op = sp.get("op");
  const exp = Number(sp.get("exp"));
  const sig = sp.get("sig") ?? "";
  if (!req.body) return NextResponse.json({ error: { code: "bad_request", message: "Fichier manquant." } }, { status: 400 });

  if (op === "put") {
    if (!verifyBlob("put", key, exp, sig)) return deny();
    await writeStreamToKey(key, req.body, sp.get("ct") ?? req.headers.get("content-type") ?? "application/octet-stream");
    return new NextResponse(null, { status: 200, headers: { ETag: `"${Date.now().toString(36)}"` } });
  }
  if (op === "part") {
    const uploadId = sp.get("upload") ?? "";
    const part = Number(sp.get("part"));
    if (!verifyBlob("part", key, exp, sig, `${uploadId}:${part}`)) return deny();
    const etag = await writeStreamToPart(uploadId, part, req.body);
    return new NextResponse(null, { status: 200, headers: { ETag: etag, "Access-Control-Expose-Headers": "ETag" } });
  }
  return deny();
}
