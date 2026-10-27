import { body, route } from "@/lib/server/http";
import { validatePost } from "@/lib/server/services/posts";
import { ValidatePostSchema } from "@/lib/server/zernio/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vérification à blanc d'une publication (rien n'est enregistré ni envoyé) :
 * règles des plateformes et du skill, puis POST /v1/tools/validate/post si Zernio est configuré.
 * → { valid, errors: [{ field, platform?, message }], warnings: [...] }
 */
export const POST = route(async (req) => {
  const { postId, ...input } = await body(req, ValidatePostSchema);
  return validatePost(input, { postId });
});
