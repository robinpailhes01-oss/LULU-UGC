/**
 * Empreinte de contenu d'un fichier (64 caractères hexadécimaux), pour repérer les doublons exacts.
 * - fichiers ≤ 256 Mo : SHA-256 complet ;
 * - au-delà : SHA-256 de (taille en texte + 4 premiers Mo + 4 Mo du milieu + 4 derniers Mo).
 * Utilise crypto.subtle (contexte sécurisé : https ou localhost) et, à défaut (accès par l'IP du
 * réseau en http), une implémentation JavaScript incrémentale. Fonctionne aussi dans un Worker.
 */

export const FULL_HASH_LIMIT = 256 * 1024 * 1024;
const SAMPLE = 4 * 1024 * 1024;
const CHUNK = 8 * 1024 * 1024;

export async function fingerprint(file: Blob): Promise<string> {
  if (file.size <= FULL_HASH_LIMIT) {
    const subtle = getSubtle();
    if (subtle) return toHex(await subtle.digest("SHA-256", await file.arrayBuffer()));
    const h = new Sha256();
    for (let off = 0; off < file.size; off += CHUNK) h.update(new Uint8Array(await file.slice(off, off + CHUNK).arrayBuffer()));
    return h.hex();
  }
  const size = new TextEncoder().encode(String(file.size));
  const midStart = Math.max(0, Math.floor(file.size / 2) - SAMPLE / 2);
  const parts = [
    new Uint8Array(await file.slice(0, SAMPLE).arrayBuffer()),
    new Uint8Array(await file.slice(midStart, midStart + SAMPLE).arrayBuffer()),
    new Uint8Array(await file.slice(Math.max(0, file.size - SAMPLE)).arrayBuffer()),
  ];
  const total = size.length + parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(total);
  let o = 0;
  for (const p of [size, ...parts]) {
    buf.set(p, o);
    o += p.length;
  }
  const subtle = getSubtle();
  if (subtle) return toHex(await subtle.digest("SHA-256", buf));
  const h = new Sha256();
  h.update(buf);
  return h.hex();
}

function getSubtle(): SubtleCrypto | null {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    return c && c.subtle && typeof c.subtle.digest === "function" ? c.subtle : null;
  } catch {
    return null;
  }
}

function toHex(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

// ---------------------------------------------------------------------------------------------
// SHA-256 incrémental (FIPS 180-4), utilisé seulement hors contexte sécurisé.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
  0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export class Sha256 {
  private h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  private w = new Uint32Array(64);
  private block = new Uint8Array(64);
  private blockLen = 0;
  private bytes = 0;

  update(data: Uint8Array): this {
    let i = 0;
    this.bytes += data.length;
    if (this.blockLen > 0) {
      const take = Math.min(64 - this.blockLen, data.length);
      this.block.set(data.subarray(0, take), this.blockLen);
      this.blockLen += take;
      i = take;
      if (this.blockLen === 64) {
        this.compress(this.block, 0);
        this.blockLen = 0;
      }
    }
    for (; i + 64 <= data.length; i += 64) this.compress(data, i);
    if (i < data.length) {
      this.block.set(data.subarray(i), 0);
      this.blockLen = data.length - i;
    }
    return this;
  }

  hex(): string {
    const bitLenHi = Math.floor((this.bytes / 0x20000000) | 0);
    const bitLenLo = (this.bytes << 3) >>> 0;
    const padLen = this.blockLen < 56 ? 56 - this.blockLen : 120 - this.blockLen;
    const pad = new Uint8Array(padLen + 8);
    pad[0] = 0x80;
    const dv = new DataView(pad.buffer);
    dv.setUint32(padLen, bitLenHi >>> 0);
    dv.setUint32(padLen + 4, bitLenLo);
    const saved = this.bytes;
    this.update(pad);
    this.bytes = saved;
    let s = "";
    for (let j = 0; j < 8; j++) s += this.h[j].toString(16).padStart(8, "0");
    return s;
  }

  private compress(d: Uint8Array, o: number) {
    const w = this.w;
    for (let t = 0; t < 16; t++) w[t] = (d[o + t * 4] << 24) | (d[o + t * 4 + 1] << 16) | (d[o + t * 4 + 2] << 8) | d[o + t * 4 + 3];
    for (let t = 16; t < 64; t++) {
      const x = w[t - 15];
      const y = w[t - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, e0, e, f, g, h] = this.h;
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (e0 + t1) | 0;
      e0 = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    const H = this.h;
    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + e0) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }
}
