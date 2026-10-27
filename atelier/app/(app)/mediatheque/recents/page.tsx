import { LibraryView } from "@/components/library/LibraryView";

export const metadata = { title: "Récents" };

export default function Page() {
  return <LibraryView mode="recent" />;
}
