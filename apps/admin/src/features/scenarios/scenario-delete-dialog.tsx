import { AdminConfirmDialog } from "../../components/admin/admin-confirm-dialog";
import type { ScenarioListItem } from "./scenarios.types";

interface ScenarioDeleteDialogProps {
  open: boolean;
  item: ScenarioListItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ScenarioDeleteDialog({
  open,
  item,
  loading,
  onClose,
  onConfirm,
}: ScenarioDeleteDialogProps) {
  return (
    <AdminConfirmDialog
      open={open}
      title="Delete Scenario"
      description={
        item
          ? `Delete "${item.title}"? This action cannot be undone.`
          : "Delete this scenario? This action cannot be undone."
      }
      confirmLabel="Delete"
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
