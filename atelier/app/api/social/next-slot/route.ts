import { route, searchParams } from "@/lib/server/http";
import { nextQueueSlot } from "@/lib/server/services/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aperçu du prochain créneau libre de la file Zernio : { slot: { nextSlot, timezone, queueName } | null }. */
export const GET = route(async (req) => ({ slot: await nextQueueSlot(searchParams(req).get("accountId")) }));
