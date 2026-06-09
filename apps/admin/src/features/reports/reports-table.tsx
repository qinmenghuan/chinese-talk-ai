import { Button } from "@learn-chinese-ai/ui";
import { AdminDataTable } from "../../components/admin/admin-data-table";
import { AdminPagination } from "../../components/admin/admin-pagination";
import { AdminRowActions } from "../../components/admin/admin-row-actions";
import {
  formatReportDifficulty,
  formatReportStatus,
  formatReportType,
} from "./reports.constants";
import type { ReportListItem } from "./reports.types";

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
interface ReportsTableProps {
  items: ReportListItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  viewingId: string | null;
  deletingId: string | null;
  onPageChange(page: number): void;
  onDetail(item: ReportListItem): void;
  onDelete(item: ReportListItem): void;
}
/* eslint-enable no-unused-vars */

export function ReportsTable({
  items,
  loading,
  page,
  pageSize,
  total,
  viewingId,
  deletingId,
  onPageChange,
  onDetail,
  onDelete,
}: ReportsTableProps) {
  return (
    <AdminDataTable
      columns={[
        {
          key: "title",
          header: "Report",
          widthClassName: "min-w-[16rem]",
          cell: (item) => (
            <div className="space-y-1">
              <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
              <p className="text-xs text-[var(--color-muted)]">{item.scenarioTitle}</p>
            </div>
          ),
        },
        {
          key: "userDisplay",
          header: "User",
          widthClassName: "min-w-[14rem]",
          cell: (item) => item.userDisplay,
        },
        {
          key: "scenarioType",
          header: "Type",
          cell: (item) => formatReportType(item.scenarioType),
        },
        {
          key: "difficulty",
          header: "Difficulty",
          cell: (item) => formatReportDifficulty(item.difficulty),
        },
        {
          key: "roleName",
          header: "Role",
          cell: (item) => item.roleName,
        },
        {
          key: "score",
          header: "Score",
          cell: (item) => `${item.score}`,
        },
        {
          key: "status",
          header: "Status",
          cell: (item) => formatReportStatus(item.status),
        },
        {
          key: "generatedAt",
          header: "Generated",
          cell: (item) => formatDateTime(item.generatedAt),
        },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          widthClassName: "min-w-[14rem]",
          cell: (item) => (
            <AdminRowActions>
              <Button
                variant="ghost"
                className="h-9 px-4"
                disabled={viewingId === item.conversationId}
                onClick={() => onDetail(item)}
              >
                {viewingId === item.conversationId ? "Loading..." : "Detail"}
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
        loading ? "Loading reports..." : "No reports matched the current filters."
      }
      footer={
        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          itemLabel="reports"
          onPageChange={onPageChange}
        />
      }
    />
  );
}
