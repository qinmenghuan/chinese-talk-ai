import type { ReactNode } from "react";

export function AdminModal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6">
      <div className="w-full max-w-2xl rounded-[24px] bg-white shadow-[var(--shadow-float)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-hairline-soft)] px-6 py-5">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
            {description ? (
              <p className="text-sm text-[var(--color-body)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-soft)]"
          >
            Close
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-hairline-soft)] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
