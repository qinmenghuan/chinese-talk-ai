import type { ReactNode } from "react";

/* eslint-disable no-unused-vars */
interface AdminDataTableColumn<TItem> {
  key: string;
  header: string;
  widthClassName?: string;
  align?: "left" | "right";
  cell(item: TItem): ReactNode;
}

interface AdminDataTableProps<TItem> {
  columns: AdminDataTableColumn<TItem>[];
  items: TItem[];
  rowKey(item: TItem): string;
  emptyState: ReactNode;
  footer?: ReactNode;
}
/* eslint-enable no-unused-vars */

export function AdminDataTable<TItem>({
  columns,
  items,
  rowKey,
  emptyState,
  footer,
}: AdminDataTableProps<TItem>) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-white shadow-[var(--shadow-float)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--color-surface-soft)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] ${
                    column.align === "right" ? "text-right" : "text-left"
                  } ${column.widthClassName ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-[var(--color-body)]"
                >
                  {emptyState}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={rowKey(item)}
                  className="border-t border-[var(--color-hairline-soft)]"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-4 align-top text-sm text-[var(--color-body)] ${
                        column.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {column.cell(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer ? (
        <div className="border-t border-[var(--color-hairline-soft)] px-4 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
