import { getActor } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { requestClientFilter } from "@/lib/server/client-scope";
import { emptyTrash } from "@/lib/server/repo/assets";

export const runtime = "nodejs";

/** Vide la corbeille (suppression définitive des fichiers). */
export const DELETE = route(async (req) => emptyTrash(await getActor(), undefined, await requestClientFilter(req)));
