import { getActor } from "@/lib/server/auth";
import { notFound, route } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { displayMessages } from "@/lib/server/agent/display";
import { deleteThread, getThread } from "@/lib/server/agent/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Messages affichables d'une conversation (AgentDisplayMessage[]), reconstruits depuis la base. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  if (!isUuid(id) || !(await getThread(id))) throw notFound("Conversation");
  return displayMessages(id);
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  if (!isUuid(id)) throw notFound("Conversation");
  const thread = await getThread(id);
  if (!thread) throw notFound("Conversation");
  await deleteThread(id);
  await logActivity({ actor: await getActor(), verb: "a supprimé la conversation", objectType: "thread", objectId: id, summary: thread.title });
  return { ok: true };
});
