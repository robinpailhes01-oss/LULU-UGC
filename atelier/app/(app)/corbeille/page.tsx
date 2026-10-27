import { LibraryView } from "@/components/library/LibraryView";

export const metadata = { title: "Corbeille" };

export default function Page() {
  return <LibraryView mode="trash" />;
}
