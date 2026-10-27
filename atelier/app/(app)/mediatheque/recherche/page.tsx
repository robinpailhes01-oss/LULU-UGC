import { LibraryView } from "@/components/library/LibraryView";

export const metadata = { title: "Recherche" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <LibraryView mode="search" query={q ?? ""} />;
}
