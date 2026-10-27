import "server-only";
import type { HyperframeLintFinding } from "@hyperframes/lint";
import type { LintFinding, LintReport } from "@/lib/client/montage/types";

/**
 * Validation des compositions avec @hyperframes/lint (règles officielles de HyperFrames :
 * structure, timeline GSAP, médias, polices…) complétée par les remarques d'Atelier (média
 * introuvable, style invalide, modèle de style incomplet…). Un rendu est bloqué s'il reste une
 * erreur ; les avertissements sont affichés sans bloquer.
 */
export type FindingSeverity = LintFinding["severity"];
export type MontageFinding = LintFinding;
export type MontageLint = LintReport;

export function atelierFinding(severity: FindingSeverity, code: string, message: string, extra: Partial<MontageFinding> = {}): MontageFinding {
  return { severity, code, message, source: "atelier", ...extra };
}

function fromHyperframes(f: HyperframeLintFinding): MontageFinding {
  return {
    severity: f.severity,
    code: f.code,
    message: f.message,
    ...(f.fixHint ? { fixHint: f.fixHint } : {}),
    ...(f.elementId ? { elementId: f.elementId } : {}),
    ...(f.selector ? { selector: f.selector } : {}),
    ...(typeof f.line === "number" ? { line: f.line } : {}),
    source: "hyperframes",
  };
}

const ORDER: Record<FindingSeverity, number> = { error: 0, warning: 1, info: 2 };

/** Lance @hyperframes/lint sur le HTML et fusionne avec les remarques d'Atelier. */
export async function lintComposition(html: string, extra: MontageFinding[] = []): Promise<MontageLint> {
  let findings: MontageFinding[] = [...extra];
  try {
    const { lintHyperframeHtml } = await import("@hyperframes/lint");
    const r = await lintHyperframeHtml(html, { filePath: "index.html", host: "cli" });
    findings = findings.concat(r.findings.map(fromHyperframes));
  } catch (err) {
    findings.push(atelierFinding("warning", "atelier_lint_unavailable", `Vérification HyperFrames indisponible : ${err instanceof Error ? err.message : String(err)}`));
  }
  findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const count = (s: FindingSeverity) => findings.filter((f) => f.severity === s).length;
  const errorCount = count("error");
  return { ok: errorCount === 0, errorCount, warningCount: count("warning"), infoCount: count("info"), findings };
}

/** Message français résumant les erreurs bloquantes d'une vérification. */
export function lintErrorSummary(lint: MontageLint): string {
  const errors = lint.findings.filter((f) => f.severity === "error");
  const first = errors.slice(0, 3).map((f) => `${f.message}${f.elementId ? ` (#${f.elementId})` : ""}`);
  return `La composition contient ${errors.length} erreur${errors.length > 1 ? "s" : ""} à corriger avant le rendu : ${first.join(" ; ")}${errors.length > 3 ? "…" : ""}`;
}
