import "server-only";
import { z } from "zod";
import { defineTool, plural, type ToolContext } from "@/lib/server/agent/tool-kit";
import { setThreadClient } from "@/lib/server/agent/store";
import {
  clientConnections,
  clientNumbers,
  createClient,
  findClient,
  getClient,
  listClients,
  setClientStatus,
  SocialInput,
  updateClient,
} from "@/lib/server/services/clients";
import { SOCIAL_LABEL, SOCIAL_PLATFORMS } from "@/lib/shared/clients";
import type { Client, SocialPlatform } from "@/lib/shared/types";

/** Outils des clients : lister, lire, créer, modifier une fiche ; changer le client de la conversation. */

const ClientRef = z.string().min(1).max(160).describe("Identifiant, slug ou nom exact du client.");

const Socials = z
  .array(
    z.object({
      platform: z.enum(SOCIAL_PLATFORMS as [SocialPlatform, ...SocialPlatform[]]),
      value: z.string().max(300).describe("Adresse du profil ou @identifiant (normalisés par l'Atelier)."),
    }),
  )
  .max(5);

function compactClient(c: Client) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    sector: c.sector || null,
    website: c.website,
    socials: c.socials.map((s) => ({ platform: s.platform, handle: s.handle, url: s.url })),
    description: c.description || null,
    archived: c.status === "archived" || undefined,
    zernio_profile: Boolean(c.zernioProfileId),
    brand: c.brand ? { summary: c.brand.summary ?? null, voice: c.brand.voice ?? null } : null,
    root_folder_id: c.rootFolderId,
    link: `/clients/${c.id}`,
  };
}

async function resolveRef(ref: string | undefined, ctx: ToolContext): Promise<Client> {
  if (!ref) {
    if (!ctx.scope.clientId) throw new Error("Aucun client dans cette conversation : précise lequel (list_clients).");
    const c = await getClient(ctx.scope.clientId);
    if (!c) throw new Error("Le client de la conversation n'existe plus.");
    return c;
  }
  const c = await findClient(ref);
  if (!c) throw new Error(`Client « ${ref} » introuvable (list_clients pour les identifiants).`);
  return c;
}

async function switchConversation(ctx: ToolContext, clientId: string | null) {
  ctx.scope.clientId = clientId;
  if (ctx.threadId) await setThreadClient(ctx.threadId, clientId);
}

export const listClientsTool = defineTool({
  name: "list_clients",
  label: "Lecture des clients",
  description: "Liste les clients de l'agence (id, nom, slug, secteur, site, réseaux, nombre de médias, publications à venir, dernière activité) et dit lequel est le client de la conversation.",
  input: z.object({ include_archived: z.boolean().optional().describe("Inclure les clients archivés.") }),
  run: async (i, ctx) => {
    const clients = await listClients({ includeArchived: i.include_archived });
    return {
      summary: plural(clients.length, "client"),
      data: {
        conversation_client_id: ctx.scope.clientId,
        clients: clients.map((c) => ({ ...compactClient(c), media: c.stats.media, scheduled_posts: c.stats.scheduledPosts, last_activity: c.stats.lastActivityAt?.slice(0, 10) ?? null })),
      },
    };
  },
});

export const getClientTool = defineTool({
  name: "get_client",
  label: "Lecture de la fiche client",
  description: "Renvoie la fiche complète d'un client (par défaut celui de la conversation) : identité, réseaux, fiche marque si analysée, chiffres clés et comptes sociaux connectés dans Zernio.",
  input: z.object({ client: ClientRef.optional() }),
  run: async (i, ctx) => {
    const c = await resolveRef(i.client, ctx);
    const [numbers, connections] = await Promise.all([clientNumbers(c.id), clientConnections(c.id)]);
    return {
      summary: `Fiche « ${c.name} »`,
      data: {
        ...compactClient(c),
        brand_full: c.brand ?? null,
        numbers,
        zernio: { configured: connections.configured, profile: Boolean(connections.profileId), accounts: connections.accounts.map((a) => ({ id: a.id, platform: a.platform, username: a.username, needs_reconnection: a.needsReconnection || undefined })), error: connections.error },
        conversation_client: ctx.scope.clientId === c.id,
      },
    };
  },
});

export const createClientTool = defineTool({
  name: "create_client",
  label: "Création d'un client",
  description:
    "Crée une fiche client (et son dossier dans la médiathèque, et son profil Zernio si Zernio est branché). Vérifie d'abord avec list_clients qu'il n'existe pas déjà. " +
    "Par défaut la conversation passe ensuite sur ce client (use_for_conversation: false pour rester où l'on est).",
  input: z.object({
    name: z.string().min(1).max(120),
    sector: z.string().max(80).optional().describe("Secteur en clair : restaurant, hôtel, boutique, bien-être, artisan, immobilier, événementiel…"),
    website: z.string().max(300).optional(),
    socials: Socials.optional(),
    description: z.string().max(2000).optional().describe("Courte description du client (ce qu'il fait, où, pour qui)."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe("Couleur de l'avatar (#RRGGBB)."),
    use_for_conversation: z.boolean().optional(),
  }),
  run: async (i, ctx) => {
    const c = await createClient({ name: i.name, sector: i.sector, website: i.website, socials: i.socials, description: i.description, color: i.color }, ctx.actor);
    const switched = i.use_for_conversation !== false;
    if (switched) await switchConversation(ctx, c.id);
    return {
      summary: `Client « ${c.name} » créé${switched ? " (conversation rattachée)" : ""}`,
      data: { ...compactClient(c), zernio_warning: c.zernioWarning ?? undefined, conversation_client: switched },
      refresh: ["clients", "folders", "threads"],
    };
  },
});

export const updateClientTool = defineTool({
  name: "update_client",
  label: "Modification de la fiche client",
  description: "Modifie la fiche d'un client (par défaut celui de la conversation) : nom, secteur, site, réseaux (la liste donnée remplace l'actuelle), description, couleur, archivage.",
  input: z.object({
    client: ClientRef.optional(),
    name: z.string().min(1).max(120).optional(),
    sector: z.string().max(80).optional(),
    website: z.string().max(300).nullable().optional(),
    socials: Socials.optional(),
    description: z.string().max(2000).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    archived: z.boolean().optional().describe("true = archiver (le client disparaît du sélecteur, rien n'est supprimé) ; false = réactiver."),
  }),
  run: async (i, ctx) => {
    const c = await resolveRef(i.client, ctx);
    const socials = i.socials?.map((s) => SocialInput.parse(s));
    let next = await updateClient(c.id, { name: i.name, sector: i.sector, website: i.website, socials, description: i.description, color: i.color }, ctx.actor);
    if (i.archived !== undefined) next = await setClientStatus(c.id, i.archived ? "archived" : "active", ctx.actor);
    const what = [
      i.name !== undefined ? "nom" : null,
      i.sector !== undefined ? "secteur" : null,
      i.website !== undefined ? "site" : null,
      socials ? `réseaux (${socials.map((s) => SOCIAL_LABEL[s.platform]).join(", ") || "aucun"})` : null,
      i.description !== undefined ? "description" : null,
      i.color !== undefined ? "couleur" : null,
      i.archived !== undefined ? (i.archived ? "archivé" : "réactivé") : null,
    ].filter(Boolean);
    return { summary: `Fiche « ${next.name} » mise à jour${what.length ? ` : ${what.join(", ")}` : ""}`, data: compactClient(next), refresh: ["clients"] };
  },
});

export const setConversationClient = defineTool({
  name: "set_conversation_client",
  label: "Changement de client",
  description:
    "Rattache la conversation à un client (ses médias, montages, publications, comptes et skills) ou à aucun (client: null = toute l'agence). Les outils suivants travaillent dans ce client, dès cet appel.",
  input: z.object({ client: ClientRef.nullable() }),
  run: async (i, ctx) => {
    if (i.client === null) {
      await switchConversation(ctx, null);
      return { summary: "Conversation sur tous les clients", data: { client: null }, refresh: ["threads"] };
    }
    const c = await resolveRef(i.client, ctx);
    await switchConversation(ctx, c.id);
    return { summary: `Conversation rattachée à « ${c.name} »`, data: compactClient(c), refresh: ["threads"] };
  },
});

export const CLIENT_TOOLS = [listClientsTool, getClientTool, createClientTool, updateClientTool, setConversationClient];
