import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      type={props.type ?? "button"}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-[var(--radius-button)] px-6 text-sm font-medium transition-colors",
        variant === "primary" &&
          "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)]",
        variant === "secondary" &&
          "border border-[var(--color-ink)] bg-white text-[var(--color-ink)]",
        variant === "ghost" &&
          "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]",
        className
      )}
      {...props}
    />
  );
}
