import type {
  AdminUserDetail,
  AdminUserListResponse,
  VoiceOption,
} from "@learn-chinese-ai/shared-types";
import { Card, SectionHeading } from "@learn-chinese-ai/ui";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { UserEditDialog } from "./user-edit-dialog";
import { UsersFilterForm } from "./users-filter-form";
import { UsersTable } from "./users-table";
import {
  defaultUsersFilters,
  type UserEditValues,
  type UserListItem,
  type UsersFilters,
} from "./users.types";

const PAGE_SIZE = 10;

function createUsersQuery(filters: UsersFilters, page: number) {
  const query = new URLSearchParams({
    page: `${page}`,
    pageSize: `${PAGE_SIZE}`,
  });

  if (filters.keyword.trim()) {
    query.set("keyword", filters.keyword.trim());
  }

  if (filters.createdFrom) {
    query.set("createdFrom", filters.createdFrom);
  }

  if (filters.createdTo) {
    query.set("createdTo", filters.createdTo);
  }

  return query.toString();
}

export function UsersPage() {
  const [draftFilters, setDraftFilters] = useState<UsersFilters>(defaultUsersFilters);
  const [appliedFilters, setAppliedFilters] = useState<UsersFilters>(defaultUsersFilters);
  const [data, setData] = useState<AdminUserListResponse>({
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<AdminUserDetail | null>(null);

  async function loadUsers(page = 1, filters = appliedFilters) {
    setLoading(true);
    setMessage("");

    try {
      const result = await apiRequest<AdminUserListResponse>(
        `/admin/users?${createUsersQuery(filters, page)}`
      );
      setData(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function ensureVoicesLoaded() {
    if (voices.length > 0) {
      return;
    }

    const result = await apiRequest<VoiceOption[]>("/system-config/voices");
    setVoices(result);
  }

  useEffect(() => {
    void loadUsers(1, defaultUsersFilters);
    void ensureVoicesLoaded();
  }, []);

  async function handleToggleStatus(user: UserListItem) {
    const nextStatus = user.status === "active" ? "disabled" : "active";

    setActionLoadingUserId(user.id);
    setMessage("");

    try {
      await apiRequest(`/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });
      setMessage("User status updated.");
      await loadUsers(data.page, appliedFilters);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update user status."
      );
    } finally {
      setActionLoadingUserId(null);
    }
  }

  async function handleOpenEdit(user: UserListItem) {
    setDialogOpen(true);
    setDialogLoading(true);
    setSelectedDetail({
      user,
    });

    try {
      await ensureVoicesLoaded();
      const detail = await apiRequest<AdminUserDetail>(`/admin/users/${user.id}`);
      setSelectedDetail(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load user detail.");
      setDialogOpen(false);
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleSubmitEdit(next: UserEditValues) {
    if (!selectedDetail) {
      return;
    }

    setDialogSubmitting(true);
    setMessage("");

    try {
      await apiRequest(`/admin/users/${selectedDetail.user.id}/profile`, {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      setDialogOpen(false);
      setMessage("User information updated.");
      await loadUsers(data.page, appliedFilters);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save user information."
      );
    } finally {
      setDialogSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Users"
        title="Manage learner accounts"
        description="Search by name or email, filter by registration time, and maintain user profile defaults from a standard admin table."
      />

      <UsersFilterForm
        value={draftFilters}
        loading={loading}
        onChange={setDraftFilters}
        onSubmit={() => {
          setAppliedFilters(draftFilters);
          void loadUsers(1, draftFilters);
        }}
        onReset={() => {
          setDraftFilters(defaultUsersFilters);
          setAppliedFilters(defaultUsersFilters);
          void loadUsers(1, defaultUsersFilters);
        }}
      />

      {message ? (
        <Card className="p-4 text-sm text-[var(--color-body)] shadow-[var(--shadow-float)]">
          {message}
        </Card>
      ) : null}

      <UsersTable
        items={data.items}
        loading={loading}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        actionLoadingUserId={actionLoadingUserId}
        onPageChange={(page) => {
          void loadUsers(page, appliedFilters);
        }}
        onToggleStatus={(user) => {
          void handleToggleStatus(user);
        }}
        onEdit={(user) => {
          void handleOpenEdit(user);
        }}
      />

      <UserEditDialog
        open={dialogOpen}
        detail={selectedDetail}
        voices={voices}
        loading={dialogLoading}
        submitting={dialogSubmitting}
        onClose={() => {
          if (dialogSubmitting) {
            return;
          }

          setDialogOpen(false);
        }}
        onSubmit={(next) => {
          void handleSubmitEdit(next);
        }}
      />
    </div>
  );
}
