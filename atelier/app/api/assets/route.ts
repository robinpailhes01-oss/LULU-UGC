import { route, searchParams } from "@/lib/server/http";
import { listAssets, type AssetListQuery } from "@/lib/server/repo/assets";
import type { AssetKind, AssetSort, AssetSource } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Liste filtrée de la médiathèque.
 * ?folder=<uuid>|root  ?q=  ?kind=photo|video|audio  ?tags=a,b  ?starred=1  ?trashed=1  ?untagged=1
 * ?source=upload|retouch|montage  ?ids=a,b  ?sort=recent|oldest|name|taken|size  ?limit=  ?offset=
 * ?parent=<uuid> (versions dérivées d'un média : retouches, rendus)
 */
export const GET = route(async (req) => {
  const sp = searchParams(req);
  const folder = sp.get("folder");
  const parent = sp.get("parent");
  const query: AssetListQuery = {
    folderId: folder === "root" ? null : folder ?? undefined,
    q: sp.get("q") ?? undefined,
    kind: (sp.get("kind") as AssetKind | null) ?? undefined,
    tags: sp.get("tags")?.split(",").filter(Boolean),
    starred: sp.get("starred") === "1",
    trashed: sp.get("trashed") === "1",
    untagged: sp.get("untagged") === "1",
    source: (sp.get("source") as AssetSource | null) ?? undefined,
    ids: sp.get("ids")?.split(",").filter(Boolean),
    sort: (sp.get("sort") as AssetSort | null) ?? undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
    parentAssetId: parent && UUID.test(parent) ? parent : undefined,
  };
  return listAssets(query);
});
