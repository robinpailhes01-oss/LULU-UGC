import { AppShell } from "@/components/shell/AppShell";
import { getActor } from "@/lib/server/auth";
import { env } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  return (
    <AppShell actor={actor} team={env.auth.team}>
      {children}
    </AppShell>
  );
}
