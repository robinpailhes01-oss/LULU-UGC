import { LoginForm } from "@/app/login/LoginForm";
import { env } from "@/lib/server/env";

export const metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-[2.2rem] font-[340] tracking-[-0.02em]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
          June <span className="italic text-chestnut">atelier</span>
        </p>
        <p className="mb-8 mt-1 text-center text-[13.5px] text-muted">Médiathèque, retouche, montage et programmation.</p>
        <LoginForm team={env.auth.team} needsPassword={Boolean(env.auth.password)} next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} />
      </div>
    </main>
  );
}
