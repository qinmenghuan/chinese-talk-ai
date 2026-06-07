import type {
  AdminScenarioListResponse,
  CreateAdminScenarioRequest,
} from "@learn-chinese-ai/shared-types";
import { Card, SectionHeading } from "@learn-chinese-ai/ui";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { ScenarioDeleteDialog } from "./scenario-delete-dialog";
import { ScenarioEditDialog } from "./scenario-edit-dialog";
import { ScenariosFilterForm } from "./scenarios-filter-form";
import { ScenariosTable } from "./scenarios-table";
import {
  defaultScenariosFilters,
  type ScenarioEditValues,
  type ScenarioListItem,
  type ScenariosFilters,
} from "./scenarios.types";

const PAGE_SIZE = 20;

function createScenariosQuery(filters: ScenariosFilters, page: number) {
  const query = new URLSearchParams({
    page: `${page}`,
    pageSize: `${PAGE_SIZE}`,
  });

  if (filters.title.trim()) {
    query.set("title", filters.title.trim());
  }

  if (filters.type) {
    query.set("type", filters.type);
  }

  if (filters.difficulty) {
    query.set("difficulty", filters.difficulty);
  }

  return query.toString();
}

export function ScenariosPage() {
  const [draftFilters, setDraftFilters] = useState<ScenariosFilters>(
    defaultScenariosFilters
  );
  const [appliedFilters, setAppliedFilters] = useState<ScenariosFilters>(
    defaultScenariosFilters
  );
  const [data, setData] = useState<AdminScenarioListResponse>({
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScenarioListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScenarioListItem | null>(null);

  async function loadScenarios(page = 1, filters = appliedFilters) {
    setLoading(true);
    setMessage("");

    try {
      const result = await apiRequest<AdminScenarioListResponse>(
        `/admin/scenarios?${createScenariosQuery(filters, page)}`
      );
      setData(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load scenarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScenarios(1, defaultScenariosFilters);
  }, []);

  async function handleSubmitEdit(next: ScenarioEditValues) {
    setDialogSubmitting(true);
    setMessage("");

    try {
      if (selectedItem) {
        await apiRequest(`/admin/scenarios/${selectedItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(next),
        });
        setMessage("Scenario updated.");
      } else {
        await apiRequest("/admin/scenarios", {
          method: "POST",
          body: JSON.stringify(next as CreateAdminScenarioRequest),
        });
        setMessage("Scenario created.");
      }

      setDialogOpen(false);
      await loadScenarios(selectedItem ? data.page : 1, appliedFilters);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save scenario.");
    } finally {
      setDialogSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleteSubmitting(true);
    setMessage("");

    try {
      await apiRequest(`/admin/scenarios/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      setMessage("Scenario deleted.");
      const nextPage =
        data.items.length === 1 && data.page > 1 ? data.page - 1 : data.page;
      await loadScenarios(nextPage, appliedFilters);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete scenario.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Scenarios"
        title="Manage conversation scenarios"
        description="Search, create, edit, and remove topic cards from a standard admin workflow."
      />

      <ScenariosFilterForm
        value={draftFilters}
        loading={loading}
        onChange={setDraftFilters}
        onSubmit={() => {
          setAppliedFilters(draftFilters);
          void loadScenarios(1, draftFilters);
        }}
        onReset={() => {
          setDraftFilters(defaultScenariosFilters);
          setAppliedFilters(defaultScenariosFilters);
          void loadScenarios(1, defaultScenariosFilters);
        }}
        onCreate={() => {
          setSelectedItem(null);
          setDialogOpen(true);
        }}
      />

      {message ? (
        <Card className="p-4 text-sm text-[var(--color-body)] shadow-[var(--shadow-float)]">
          {message}
        </Card>
      ) : null}

      <ScenariosTable
        items={data.items}
        loading={loading}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        deletingId={deleteSubmitting ? (deleteTarget?.id ?? null) : null}
        onPageChange={(page) => {
          void loadScenarios(page, appliedFilters);
        }}
        onEdit={(item) => {
          setSelectedItem(item);
          setDialogOpen(true);
        }}
        onDelete={(item) => {
          setDeleteTarget(item);
          setDeleteOpen(true);
        }}
      />

      <ScenarioEditDialog
        open={dialogOpen}
        item={selectedItem}
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

      <ScenarioDeleteDialog
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
