import { LibraryView } from "@/components/library/LibraryView";

export const metadata = { title: "Médiathèque" };

export default function Page() {
  return <LibraryView mode="root" />;
}
