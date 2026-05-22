import * as React from "react";
import { cn } from "../lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-white",
        className
      )}
      {...props}
    />
  );
}
