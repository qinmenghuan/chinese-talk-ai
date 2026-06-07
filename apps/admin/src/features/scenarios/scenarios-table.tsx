import { Button } from "@learn-chinese-ai/ui";
import { AdminDataTable } from "../../components/admin/admin-data-table";
import { AdminPagination } from "../../components/admin/admin-pagination";
import { AdminRowActions } from "../../components/admin/admin-row-actions";
import { formatScenarioDifficulty, formatScenarioType } from "./scenarios.constants";
import type { ScenarioListItem } from "./scenarios.types";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/* eslint-disable no-unused-vars */
interface ScenariosTableProps {
  items: ScenarioListItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  deletingId: string | null;
  onPageChange(page: number): void;
  onEdit(item: ScenarioListItem): void;
  onDelete(item: ScenarioListItem): void;
}
/* eslint-enable no-unused-vars */

export function ScenariosTable({
  items,
  loading,
  page,
  pageSize,
  total,
  deletingId,
  onPageChange,
  onEdit,
  onDelete,
}: ScenariosTableProps) {
  return (
    <AdminDataTable
      columns={[
        {
          key: "title",
          header: "Scenario",
          widthClassName: "min-w-[14rem]",
          cell: (item) => (
            <div className="space-y-1">
              <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
              <p className="text-xs text-[var(--color-muted)]">{item.id}</p>
            </div>
          ),
        },
        {
          key: "type",
          header: "Type",
          cell: (item) => formatScenarioType(item.type),
        },
        {
          key: "difficulty",
          header: "Difficulty",
          cell: (item) => formatScenarioDifficulty(item.difficulty),
        },
        {
          key: "imageUrl",
          header: "Image",
          widthClassName: "min-w-[16rem]",
          cell: (item) => (
            <a
              href={item.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-1 text-[var(--color-primary)] underline underline-offset-2"
            >
              View image
            </a>
          ),
        },
        {
          key: "updatedAt",
          header: "Updated",
          cell: (item) => formatDateTime(item.updatedAt),
        },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          widthClassName: "min-w-[12rem]",
          cell: (item) => (
            <AdminRowActions>
              <Button variant="ghost" className="h-9 px-4" onClick={() => onEdit(item)}>
                Edit
              </Button>
              <Button
                variant="secondary"
                className="h-9 px-4"
                disabled={deletingId === item.id}
                onClick={() => onDelete(item)}
              >
                {deletingId === item.id ? "Deleting..." : "Delete"}
              </Button>
            </AdminRowActions>
          ),
        },
      ]}
      items={items}
      rowKey={(item) => item.id}
      emptyState={
        loading ? "Loading scenarios..." : "No scenarios matched the current filters."
      }
      footer={
        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          itemLabel="scenarios"
          onPageChange={onPageChange}
        />
      }
    />
  );
}
