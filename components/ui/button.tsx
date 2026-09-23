import * as React from "react";
import { cn } from "@/lib/utils";

/** Bouton shadcn simplifié (sans radix ni cva), aux couleurs June. */
type Variant = "default" | "outline" | "ghost";
type Size = "default" | "lg" | "sm";
const VARIANT: Record<Variant, string> = {
  default: "bg-ink text-ivory hover:bg-brown",
  outline: "border border-ink/30 bg-transparent text-ink hover:bg-ink hover:text-ivory",
  ghost: "text-ink hover:bg-ink/5",
};
const SIZE: Record<Size, string> = { default: "h-11 px-6", lg: "h-12 px-8", sm: "h-9 px-4" };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", size = "default", ...props }, ref) => (
  <button ref={ref} className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brown focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", VARIANT[variant], SIZE[size], className)} {...props} />
));
Button.displayName = "Button";
