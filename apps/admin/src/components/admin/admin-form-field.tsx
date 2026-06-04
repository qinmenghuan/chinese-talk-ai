import type { ReactNode } from "react";

export function AdminFormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm text-[var(--color-body)]">
      <span className="font-medium text-[var(--color-ink)]">{label}</span>
      {children}
    </label>
  );
}
