import { Button } from "@learn-chinese-ai/ui";

/* eslint-disable no-unused-vars */
interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  itemLabel: string;
  onPageChange: (page: number) => void;
}
/* eslint-enable no-unused-vars */

export function AdminPagination({
  page,
  pageSize,
  total,
  loading = false,
  itemLabel,
  onPageChange,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-[var(--color-body)]">
        Showing {start} to {end} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="h-9 px-4"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="px-2 text-sm text-[var(--color-body)]">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          className="h-9 px-4"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
