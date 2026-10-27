import { RetouchEditor } from "@/components/retouch/RetouchEditor";

export const metadata = { title: "Retouche" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RetouchEditor assetId={id} />;
}
