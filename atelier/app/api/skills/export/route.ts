import { route } from "@/lib/server/http";
import { exportSkills } from "@/lib/server/services/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tous les skills au format du dépôt — utilisé par `npm run skills:pull`. */
export const GET = route(async () => ({ exportedAt: new Date().toISOString(), skills: await exportSkills() }));
