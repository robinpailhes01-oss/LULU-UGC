import { SkillEditor } from "@/components/skills/SkillEditor";

export const metadata = { title: "Skill" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SkillEditor slug={slug} />;
}
