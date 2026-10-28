"use client";

import { Suspense } from "react";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { UploadProvider } from "@/components/library/UploadProvider";
import { MenuProvider } from "@/components/ui/Menu";
import { ToastProvider } from "@/components/ui/Toast";
import { ShellProvider, useShell } from "@/components/shell/ShellContext";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import type { Client } from "@/lib/shared/types";

/** Coque de l'application : navigation à gauche, contenu au centre, agent à droite. */
export function AppShell({ actor, team, appName, initialClient, children }: { actor: string | null; team: string[]; appName: string; initialClient: Client | null; children: React.ReactNode }) {
  return (
    <ToastProvider>
      <MenuProvider>
        <ShellProvider actor={actor} team={team} appName={appName} initialClient={initialClient}>
          <UploadProvider>
            <ShellLayout>{children}</ShellLayout>
          </UploadProvider>
        </ShellProvider>
      </MenuProvider>
    </ToastProvider>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { agentOpen } = useShell();
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 border-b border-line" />}>
          <Topbar />
        </Suspense>
        <main id="contenu" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <AgentPanel open={agentOpen} />
      <NewClientDialog />
    </div>
  );
}
