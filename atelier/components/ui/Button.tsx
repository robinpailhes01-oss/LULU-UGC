"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "@/components/ui/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-surface hover:bg-[#3a2f26] disabled:bg-ink/40",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-hover",
  ghost: "text-ink hover:bg-hover",
  danger: "bg-terracotta text-surface hover:bg-[#8f3c22]",
  accent: "bg-chestnut text-surface hover:bg-[#744d2a]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-[13.5px] gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

/** Bouton d'Atelier. Le primaire (espresso) est réservé à l'action principale d'un écran. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md";
  active?: boolean;
}

/** Bouton icône carré avec libellé accessible (affiché en infobulle). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, size = "md", active, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-fast hover:bg-hover hover:text-ink disabled:opacity-40",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        active && "bg-select text-chestnut",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
