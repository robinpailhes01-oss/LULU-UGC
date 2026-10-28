import { redirect } from "next/navigation";
import { LibraryView } from "@/components/library/LibraryView";
import { getCurrentClientId } from "@/lib/server/client-scope";
import { clientRootFolderId } from "@/lib/server/repo/folders";

export const metadata = { title: "Médiathèque" };
export const dynamic = "force-dynamic";

export default async function Page() {
  // Avec un client courant, la racine de la médiathèque est le dossier du client.
  const clientId = await getCurrentClientId();
  const root = clientId ? await clientRootFolderId(clientId) : null;
  if (root) redirect(`/mediatheque/dossier/${root}`);
  return <LibraryView mode="root" />;
}
