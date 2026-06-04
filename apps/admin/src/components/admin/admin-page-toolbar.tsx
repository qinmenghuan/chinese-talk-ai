import type { ReactNode } from "react";

export function AdminPageToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-white p-5 shadow-[var(--shadow-float)]">
      {children}
    </div>
  );
}
