import { Suspense } from "react";
import { ClientSheet } from "@/components/clients/ClientSheet";

export const metadata = { title: "Fiche client" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ClientSheet id={id} />
    </Suspense>
  );
}
