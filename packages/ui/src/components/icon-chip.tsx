import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";

export interface IconChipProps {
  icon: LucideIcon;
  label: string;
  className?: string;
}

export function IconChip({ icon: Icon, label, className }: IconChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-soft)] px-3 py-2 text-sm text-[var(--color-ink)]",
        className
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      <span>{label}</span>
    </div>
  );
}
