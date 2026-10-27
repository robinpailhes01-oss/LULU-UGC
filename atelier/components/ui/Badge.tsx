import { cx } from "@/components/ui/cx";

type Tone = "neutral" | "honey" | "olive" | "terracotta" | "plum" | "chestnut" | "dark";

const TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-muted",
  honey: "bg-honey-soft text-[#7a5220]",
  olive: "bg-olive-soft text-olive",
  terracotta: "bg-terracotta-soft text-terracotta",
  plum: "bg-plum-soft text-plum",
  chestnut: "bg-select text-chestnut",
  dark: "bg-night/70 text-surface backdrop-blur",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold", TONES[tone], className)}>{children}</span>;
}
