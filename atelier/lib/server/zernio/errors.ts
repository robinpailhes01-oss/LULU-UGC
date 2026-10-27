import "server-only";
import { HttpError } from "@/lib/server/http";

/** Message affichable d'une erreur (HttpError, ZernioError ou autre). */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpError) return err.message;
  if (err instanceof Error) return err.message;
  return "Erreur inattendue.";
}
