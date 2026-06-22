import { AdminConfirmDialog } from "../../components/admin/admin-confirm-dialog";
import type { ConversationListItem } from "./conversations.types";

interface ConversationDeleteDialogProps {
  open: boolean;
  item: ConversationListItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConversationDeleteDialog({
  open,
  item,
  loading,
  onClose,
  onConfirm,
}: ConversationDeleteDialogProps) {
  return (
    <AdminConfirmDialog
      open={open}
      title="Delete Conversation"
      description={
        item
          ? `Delete "${item.title}"? This conversation will be hidden from future queries.`
          : "Delete this conversation? This conversation will be hidden from future queries."
      }
      confirmLabel="Delete"
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
