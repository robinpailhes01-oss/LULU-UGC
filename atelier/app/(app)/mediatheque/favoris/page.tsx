import { LibraryView } from "@/components/library/LibraryView";

export const metadata = { title: "Favoris" };

export default function Page() {
  return <LibraryView mode="starred" />;
}
