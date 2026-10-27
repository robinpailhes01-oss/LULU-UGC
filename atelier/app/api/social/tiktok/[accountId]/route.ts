import { route, searchParams } from "@/lib/server/http";
import { tiktokCreatorInfo } from "@/lib/server/services/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ accountId: string }> };

/** Infos TikTok du créateur (confidentialité possible, réglages désactivés, durée maximale). ?mediaType=video|photo */
export const GET = route<Ctx>(async (req, { params }) => {
  const { accountId } = await params;
  const mediaType = searchParams(req).get("mediaType") === "photo" ? "photo" : "video";
  return tiktokCreatorInfo(accountId, mediaType);
});
