import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn("flex h-11 w-full rounded-md border border-ink/20 bg-white/40 px-3.5 py-2 text-[0.95rem] text-ink placeholder:text-taupe/60 transition-colors focus-visible:border-brown focus-visible:bg-white/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
));
Input.displayName = "Input";
