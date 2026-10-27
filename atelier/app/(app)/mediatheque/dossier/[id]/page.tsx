import { LibraryView } from "@/components/library/LibraryView";

export const metadata = { title: "Dossier" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LibraryView mode="folder" folderId={id} />;
}
