import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--color-surface-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--color-ink)]",
        className
      )}
      {...props}
    />
  );
}
