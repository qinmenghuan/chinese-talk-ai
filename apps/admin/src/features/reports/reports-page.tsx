import type {
  AdminReportListResponse,
  ReportDetail,
} from "@learn-chinese-ai/shared-types";
import { Card, SectionHeading } from "@learn-chinese-ai/ui";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { ReportDeleteDialog } from "./report-delete-dialog";
import { ReportDetailDialog } from "./report-detail-dialog";
import { ReportsFilterForm } from "./reports-filter-form";
import { ReportsTable } from "./reports-table";
import {
  defaultReportsFilters,
  type ReportListItem,
  type ReportsFilters,
} from "./reports.types";

const PAGE_SIZE = 20;

function createReportsQuery(filters: ReportsFilters, page: number) {
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

export function ReportsPage() {
  const [draftFilters, setDraftFilters] = useState<ReportsFilters>(defaultReportsFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<ReportsFilters>(defaultReportsFilters);
  const [data, setData] = useState<AdminReportListResponse>({
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTarget, setDetailTarget] = useState<ReportListItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ReportDetail | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReportListItem | null>(null);

  async function loadReports(page = 1, filters = appliedFilters) {
    setLoading(true);
    setMessage("");

    try {
      const result = await apiRequest<AdminReportListResponse>(
        `/admin/reports?${createReportsQuery(filters, page)}`
      );
      setData(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports(1, defaultReportsFilters);
  }, []);

  async function handleOpenDetail(item: ReportListItem) {
    setDetailTarget(item);
    setSelectedDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    setMessage("");

    try {
      const result = await apiRequest<ReportDetail>(
        `/admin/reports/${item.conversationId}/detail`
      );
      setSelectedDetail(result);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load report detail."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleteSubmitting(true);
    setMessage("");

    try {
      await apiRequest(`/admin/reports/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      setMessage("Report deleted.");
      const nextPage =
        data.items.length === 1 && data.page > 1 ? data.page - 1 : data.page;
      await loadReports(nextPage, appliedFilters);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete report.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Reports"
        title="Manage generated practice reports"
        description="Search reports by time, user, title, and type, inspect the generated detail, and logically delete reports from the admin workflow."
      />

      <ReportsFilterForm
        value={draftFilters}
        loading={loading}
        onChange={setDraftFilters}
        onSubmit={() => {
          setAppliedFilters(draftFilters);
          void loadReports(1, draftFilters);
        }}
        onReset={() => {
          setDraftFilters(defaultReportsFilters);
          setAppliedFilters(defaultReportsFilters);
          void loadReports(1, defaultReportsFilters);
        }}
      />

      {message ? (
        <Card className="p-4 text-sm text-[var(--color-body)] shadow-[var(--shadow-float)]">
          {message}
        </Card>
      ) : null}

      <ReportsTable
        items={data.items}
        loading={loading}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        viewingId={detailLoading ? (detailTarget?.conversationId ?? null) : null}
        deletingId={deleteSubmitting ? (deleteTarget?.id ?? null) : null}
        onPageChange={(page) => {
          void loadReports(page, appliedFilters);
        }}
        onDetail={(item) => {
          void handleOpenDetail(item);
        }}
        onDelete={(item) => {
          setDeleteTarget(item);
          setDeleteOpen(true);
        }}
      />

      <ReportDetailDialog
        open={detailOpen}
        loading={detailLoading}
        detail={selectedDetail}
        onClose={() => {
          setDetailOpen(false);
          setDetailTarget(null);
          setSelectedDetail(null);
        }}
      />

      <ReportDeleteDialog
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
