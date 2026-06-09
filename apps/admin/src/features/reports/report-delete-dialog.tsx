import { AdminConfirmDialog } from "../../components/admin/admin-confirm-dialog";
import type { ReportListItem } from "./reports.types";

interface ReportDeleteDialogProps {
  open: boolean;
  item: ReportListItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReportDeleteDialog({
  open,
  item,
  loading,
  onClose,
  onConfirm,
}: ReportDeleteDialogProps) {
  return (
    <AdminConfirmDialog
      open={open}
      title="Delete Report"
      description={
        item
          ? `Delete "${item.title}"? This report will be hidden from future queries.`
          : "Delete this report? This report will be hidden from future queries."
      }
      confirmLabel="Delete"
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
