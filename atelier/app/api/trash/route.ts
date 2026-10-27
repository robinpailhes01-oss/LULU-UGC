import { getActor } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { emptyTrash } from "@/lib/server/repo/assets";

export const runtime = "nodejs";

/** Vide la corbeille (suppression définitive des fichiers). */
export const DELETE = route(async () => emptyTrash(await getActor()));
