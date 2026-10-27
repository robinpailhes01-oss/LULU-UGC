import "server-only";
import { env } from "@/lib/server/env";
import { createLocalStore } from "@/lib/server/storage/local";
import { createS3Store } from "@/lib/server/storage/s3";
import type { BlobStore } from "@/lib/server/storage/types";

export type { BlobStore, PresignedPut, BlobHead } from "@/lib/server/storage/types";
export { keys, extFromName } from "@/lib/server/storage/types";

let store: BlobStore | null = null;

/** Stockage actif : S3/R2 si configuré, sinon disque local. */
export function getStore(): BlobStore {
  if (!store) store = env.storage.kind === "s3" ? createS3Store() : createLocalStore();
  return store;
}
