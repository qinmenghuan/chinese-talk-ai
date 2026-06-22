import type { ReactNode } from "react";

type AdminFormFieldLayout = "stacked" | "inline";

export function AdminFormField({
  label,
  children,
  layout = "stacked",
  labelClassName,
}: {
  label: string;
  children: ReactNode;
  layout?: AdminFormFieldLayout;
  labelClassName?: string;
}) {
  return (
    <label
      className={`text-sm text-[var(--color-body)] ${
        layout === "inline"
          ? "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
          : "block space-y-2"
      }`}
    >
      <span className={`font-medium text-[var(--color-ink)] ${labelClassName ?? ""}`}>
        {layout === "inline" ? `${label}:` : label}
      </span>
      {children}
    </label>
  );
}
