import type { AdminConversationListResponse } from "@learn-chinese-ai/shared-types";
import { Card, SectionHeading } from "@learn-chinese-ai/ui";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { ConversationDeleteDialog } from "./conversation-delete-dialog";
import { ConversationsFilterForm } from "./conversations-filter-form";
import { ConversationsTable } from "./conversations-table";
import {
  defaultConversationsFilters,
  type ConversationListItem,
  type ConversationsFilters,
} from "./conversations.types";

const PAGE_SIZE = 20;

function createConversationsQuery(filters: ConversationsFilters, page: number) {
  const query = new URLSearchParams({
    page: `${page}`,
    pageSize: `${PAGE_SIZE}`,
  });

  if (filters.startedFrom) {
    query.set("startedFrom", filters.startedFrom);
  }

  if (filters.startedTo) {
    query.set("startedTo", filters.startedTo);
  }

  if (filters.userKeyword.trim()) {
    query.set("userKeyword", filters.userKeyword.trim());
  }

  if (filters.title.trim()) {
    query.set("title", filters.title.trim());
  }

  if (filters.type) {
    query.set("type", filters.type);
  }

  return query.toString();
}

export function ConversationsPage() {
  const [draftFilters, setDraftFilters] = useState<ConversationsFilters>(
    defaultConversationsFilters
  );
  const [appliedFilters, setAppliedFilters] = useState<ConversationsFilters>(
    defaultConversationsFilters
  );
  const [data, setData] = useState<AdminConversationListResponse>({
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConversationListItem | null>(null);

  async function loadConversations(page = 1, filters = appliedFilters) {
    setLoading(true);
    setMessage("");

    try {
      const result = await apiRequest<AdminConversationListResponse>(
        `/admin/conversations?${createConversationsQuery(filters, page)}`
      );
      setData(result);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load conversations."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations(1, defaultConversationsFilters);
  }, []);

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleteSubmitting(true);
    setMessage("");

    try {
      await apiRequest(`/admin/conversations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      setMessage("Conversation deleted.");
      const nextPage =
        data.items.length === 1 && data.page > 1 ? data.page - 1 : data.page;
      await loadConversations(nextPage, appliedFilters);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to delete conversation."
      );
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Conversations"
        title="Manage realtime conversations"
        description="Search conversation records by time, user, title, and type, then logically delete records from a standard admin workflow."
      />

      <ConversationsFilterForm
        value={draftFilters}
        loading={loading}
        onChange={setDraftFilters}
        onSubmit={() => {
          setAppliedFilters(draftFilters);
          void loadConversations(1, draftFilters);
        }}
        onReset={() => {
          setDraftFilters(defaultConversationsFilters);
          setAppliedFilters(defaultConversationsFilters);
          void loadConversations(1, defaultConversationsFilters);
        }}
      />

      {message ? (
        <Card className="p-4 text-sm text-[var(--color-body)] shadow-[var(--shadow-float)]">
          {message}
        </Card>
      ) : null}

      <ConversationsTable
        items={data.items}
        loading={loading}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        deletingId={deleteSubmitting ? (deleteTarget?.id ?? null) : null}
        onPageChange={(page) => {
          void loadConversations(page, appliedFilters);
        }}
        onDelete={(item) => {
          setDeleteTarget(item);
          setDeleteOpen(true);
        }}
      />

      <ConversationDeleteDialog
        open={deleteOpen}
        item={deleteTarget}
        loading={deleteSubmitting}
        onClose={() => {
          if (deleteSubmitting) {
            return;
          }

          setDeleteOpen(false);
        }}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </div>
  );
}
