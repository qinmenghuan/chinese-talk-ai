import * as React from "react";
import { cn } from "../lib/cn";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left"
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-3", align === "center" && "text-center")}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[28px] font-bold text-[var(--color-ink)]">{title}</h2>
      {description ? (
        <p className="max-w-2xl text-base leading-7 text-[var(--color-body)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
