import { Button } from "@learn-chinese-ai/ui";
import { AdminModal } from "./admin-modal";

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onClose,
}: AdminConfirmDialogProps) {
  return (
    <AdminModal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-7 text-[var(--color-body)]">{description}</p>
    </AdminModal>
  );
}
