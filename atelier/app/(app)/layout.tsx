import { AppShell } from "@/components/shell/AppShell";
import { getActor } from "@/lib/server/auth";
import { getCurrentClientId } from "@/lib/server/client-scope";
import { env } from "@/lib/server/env";
import { getClient } from "@/lib/server/services/clients";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  // Client courant (cookie du sélecteur) : affiché dès le premier rendu, sans clignotement.
  const clientId = await getCurrentClientId().catch(() => null);
  const client = clientId ? await getClient(clientId).catch(() => null) : null;
  return (
    <AppShell actor={actor} team={env.auth.team} appName={env.appName} initialClient={client}>
      {children}
    </AppShell>
  );
}
