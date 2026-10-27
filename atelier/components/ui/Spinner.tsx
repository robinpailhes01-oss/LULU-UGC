import { Loader2 } from "lucide-react";
import { cx } from "@/components/ui/cx";

export function Spinner({ className, label = "Chargement…" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cx("inline-flex items-center gap-2 text-muted", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
