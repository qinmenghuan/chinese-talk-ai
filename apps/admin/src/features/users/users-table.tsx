import { Badge, Button } from "@learn-chinese-ai/ui";
import { AdminDataTable } from "../../components/admin/admin-data-table";
import { AdminRowActions } from "../../components/admin/admin-row-actions";
import { UserStatusAction } from "./user-status-action";
import type { UserListItem } from "./users.types";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
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

function formatLevel(value: UserListItem["preference"]["proficiencyLevel"]) {
  if (value === "beginner") {
    return "Low";
  }

  if (value === "intermediate") {
    return "Medium";
  }

  return "High";
}

/* eslint-disable no-unused-vars */
interface UsersTableProps {
  items: UserListItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange(page: number): void;
  actionLoadingUserId: string | null;
  onToggleStatus(user: UserListItem): void;
  onEdit(user: UserListItem): void;
}
/* eslint-enable no-unused-vars */

export function UsersTable({
  items,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  actionLoadingUserId,
  onToggleStatus,
  onEdit,
}: UsersTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <AdminDataTable
      columns={[
        {
          key: "displayName",
          header: "User",
          widthClassName: "min-w-[15rem]",
          cell: (item) => (
            <div className="space-y-1">
              <p className="font-medium text-[var(--color-ink)]">{item.displayName}</p>
              <p className="text-xs text-[var(--color-muted)]">{item.email}</p>
            </div>
          ),
        },
        {
          key: "level",
          header: "Level",
          cell: (item) => formatLevel(item.preference.proficiencyLevel),
        },
        {
          key: "goal",
          header: "Goal",
          cell: (item) => item.preference.learningGoal,
        },
        {
          key: "voice",
          header: "Voice",
          cell: (item) => item.preference.preferredVoiceId ?? "-",
        },
        {
          key: "status",
          header: "Status",
          cell: (item) => (
            <Badge
              className={
                item.status === "active"
                  ? "bg-[#ebfff4] text-[#166534]"
                  : "bg-[#fff1f2] text-[#be123c]"
              }
            >
              {item.status === "active" ? "Enabled" : "Disabled"}
            </Badge>
          ),
        },
        {
          key: "createdAt",
          header: "Registered",
          cell: (item) => formatDateTime(item.createdAt),
        },
        {
          key: "lastLoginAt",
          header: "Last Login",
          cell: (item) => formatDateTime(item.lastLoginAt),
        },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          widthClassName: "min-w-[14rem]",
          cell: (item) => (
            <AdminRowActions>
              <UserStatusAction
                user={item}
                loading={actionLoadingUserId === item.id}
                onToggle={onToggleStatus}
              />
              <Button
                variant="ghost"
                className="h-9 px-4"
                disabled={loading}
                onClick={() => onEdit(item)}
              >
                Edit
              </Button>
            </AdminRowActions>
          ),
        },
      ]}
      items={items}
      rowKey={(item) => item.id}
      emptyState={loading ? "Loading users..." : "No users matched the current filters."}
      footer={
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--color-body)]">
            Showing {start} to {end} of {total} users
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
      }
    />
  );
}
