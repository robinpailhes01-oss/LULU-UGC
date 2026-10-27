import "server-only";
import { z } from "zod";
import { serviceErrorMessage } from "@/lib/server/agent/errors";
import { defineTool, parisDateTime, plural } from "@/lib/server/agent/tool-kit";
import { env } from "@/lib/server/env";
import { listTags, storageTotals } from "@/lib/server/repo/assets";
import { buildCleanupReport } from "@/lib/server/services/cleanup";
import { listMontages } from "@/lib/server/services/montages";
import { listPosts } from "@/lib/server/services/posts";
import { listSkills } from "@/lib/server/services/skills";
import { CLEANUP_LABEL, MONTAGE_STATUS_LABEL, PLATFORM_LABEL } from "@/lib/shared/labels";
import { formatBytes } from "@/lib/shared/format";
import type { CleanupKind } from "@/lib/shared/types";

/** Outils de pilotage : vue d'ensemble et proposition de ménage. */

const KINDS = Object.keys(CLEANUP_LABEL) as [CleanupKind, ...CleanupKind[]];

export const cleanupReport = defineTool({
  name: "cleanup_report",
  label: "Analyse du ménage",
  description:
    "Analyse toute la médiathèque (hors corbeille) et renvoie les candidats au ménage : doublons exacts et quasi-doublons (avec le média conseillé à garder), photos floues, trop sombres ou trop claires, petites résolutions, vidéos très courtes. " +
    "Tu PROPOSES à partir de ce rapport (regarde les images en cas de doute avec view_images) ; la mise à la corbeille passe ensuite par trash_assets, que l'utilisateur confirme.",
  input: z.object({
    kinds: z.array(z.enum(KINDS)).max(7).optional().describe("Limiter à certains types de problèmes."),
    max_groups: z.number().int().min(1).max(40).optional().describe("Groupes détaillés au plus (15 par défaut)."),
  }),
  run: async (i) => {
    const report = await buildCleanupReport();
    const wanted = new Set(i.kinds ?? KINDS);
    const groups = report.groups.filter((g) => wanted.has(g.kind));
    const name = (id: string) => report.assets[id]?.name ?? id;
    const top = groups.slice(0, i.max_groups ?? 15).map((g) => ({
      kind: g.kind,
      label: CLEANUP_LABEL[g.kind],
      reason: g.reason,
      keep: g.keepId ? { id: g.keepId, name: name(g.keepId) } : null,
      assets: g.assetIds.map((id) => ({ id, name: name(id) })),
      suggested_trash_ids: g.keepId ? g.assetIds.filter((id) => id !== g.keepId) : g.assetIds,
    }));
    const counts = Object.fromEntries(Object.entries(report.counts).filter(([k, n]) => wanted.has(k as CleanupKind) && n > 0));
    const toTrash = [...new Set(top.flatMap((g) => g.suggested_trash_ids))];
    return {
      summary: groups.length === 0 ? "Rien à nettoyer" : `${plural(groups.length, "groupe")} à examiner (${formatBytes(report.reclaimableBytes)} récupérables)`,
      data: { generated_at: report.generatedAt, counts, reclaimable: formatBytes(report.reclaimableBytes), groups_total: groups.length, groups: top, link: "/menage" },
      assetIds: toTrash.slice(0, 12),
    };
  },
});

export const getOverview = defineTool({
  name: "get_overview",
  label: "Vue d'ensemble",
  description: "Vue d'ensemble de l'Atelier : médias (photos, vidéos, stockage, non tagués, corbeille), mots-clés fréquents, prochaines publications, derniers montages, nombre de skills. À appeler pour un point d'étape ou « qu'est-ce qui reste à faire ? ».",
  input: z.object({}),
  run: async () => {
    const tz = env.zernio.timezone;
    const safe = async <T,>(fn: () => Promise<T>): Promise<T | { indisponible: string }> => {
      try {
        return await fn();
      } catch (err) {
        return { indisponible: serviceErrorMessage(err) };
      }
    };
    const now = Date.now();
    const [totals, tags, posts, montages, skills] = await Promise.all([
      storageTotals(),
      safe(async () => (await listTags()).slice(0, 15).map((t) => `${t.tag} (${t.count})`)),
      safe(async () =>
        (await listPosts({ from: new Date(now).toISOString(), to: new Date(now + 14 * 86_400_000).toISOString(), status: ["scheduled", "publishing", "failed"] })).slice(0, 10).map((p) => ({
          id: p.id,
          when: p.scheduledFor ? parisDateTime(p.scheduledFor, p.timezone || tz) : null,
          status: p.status,
          targets: p.targets.map((t) => `${PLATFORM_LABEL[t.platform] ?? t.platform}${t.username ? ` @${t.username}` : ""}`).join(", "),
          caption: p.caption.slice(0, 80),
        })),
      ),
      safe(async () => (await listMontages()).slice(0, 6).map((m) => ({ id: m.id, title: m.title, status: MONTAGE_STATUS_LABEL[m.status], updated: m.updatedAt.slice(0, 10) }))),
      safe(async () => (await listSkills()).length),
    ]);
    return {
      summary: `${plural(totals.photos, "photo")}, ${plural(totals.videos, "vidéo")}, ${formatBytes(totals.bytes)}`,
      data: {
        media: { photos: totals.photos, videos: totals.videos, audio: totals.audio, storage: formatBytes(totals.bytes), untagged: totals.untagged, trashed: totals.trashed },
        top_tags: tags,
        upcoming_posts: posts,
        recent_montages: montages,
        skills,
      },
    };
  },
});

export const OVERVIEW_TOOLS = [cleanupReport, getOverview];
