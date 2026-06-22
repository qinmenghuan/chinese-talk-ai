import { Button } from "@learn-chinese-ai/ui";
import { AdminDataTable } from "../../components/admin/admin-data-table";
import { AdminPagination } from "../../components/admin/admin-pagination";
import { AdminRowActions } from "../../components/admin/admin-row-actions";
import {
  formatConversationDifficulty,
  formatConversationReportState,
  formatConversationStatus,
  formatConversationType,
} from "./conversations.constants";
import type { ConversationListItem } from "./conversations.types";

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

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
interface ConversationsTableProps {
  items: ConversationListItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  deletingId: string | null;
  onPageChange(page: number): void;
  onDelete(item: ConversationListItem): void;
}
/* eslint-enable no-unused-vars */

export function ConversationsTable({
  items,
  loading,
  page,
  pageSize,
  total,
  deletingId,
  onPageChange,
  onDelete,
}: ConversationsTableProps) {
  return (
    <AdminDataTable
      columns={[
        {
          key: "title",
          header: "Conversation",
          widthClassName: "min-w-[15rem]",
          cell: (item) => (
            <div className="space-y-1">
              <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
              <p className="text-xs text-[var(--color-muted)]">{item.id}</p>
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
          cell: (item) => formatConversationType(item.scenarioType),
        },
        {
          key: "difficulty",
          header: "Difficulty",
          cell: (item) => formatConversationDifficulty(item.difficulty),
        },
        {
          key: "roleName",
          header: "Role",
          cell: (item) => item.roleName,
        },
        {
          key: "startedAt",
          header: "Started",
          cell: (item) => formatDateTime(item.startedAt),
        },
        {
          key: "endedAt",
          header: "Ended",
          cell: (item) => formatDateTime(item.endedAt),
        },
        {
          key: "status",
          header: "Status",
          cell: (item) => formatConversationStatus(item.status),
        },
        {
          key: "reportState",
          header: "Report",
          cell: (item) => formatConversationReportState(item.reportState),
        },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          widthClassName: "min-w-[10rem]",
          cell: (item) => (
            <AdminRowActions>
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
        loading
          ? "Loading conversations..."
          : "No conversations matched the current filters."
      }
      footer={
        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          itemLabel="conversations"
          onPageChange={onPageChange}
        />
      }
    />
  );
}
