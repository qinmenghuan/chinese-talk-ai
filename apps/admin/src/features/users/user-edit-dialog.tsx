import type { VoiceOption } from "@learn-chinese-ai/shared-types";
import { Button } from "@learn-chinese-ai/ui";
import { useEffect, useState } from "react";
import { AdminModal } from "../../components/admin/admin-modal";
import { UserEditForm } from "./user-edit-form";
import type { UserDetail, UserEditValues } from "./users.types";

function createInitialValues(detail: UserDetail | null): UserEditValues {
  return {
    displayName: detail?.user.displayName ?? "",
    proficiencyLevel: detail?.user.preference.proficiencyLevel ?? "beginner",
    learningGoal: detail?.user.preference.learningGoal ?? "daily",
    preferredVoiceId: detail?.user.preference.preferredVoiceId ?? "friendly-female",
  };
}

/* eslint-disable no-unused-vars */
interface UserEditDialogProps {
  open: boolean;
  detail: UserDetail | null;
  voices: VoiceOption[];
  loading: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit(next: UserEditValues): void;
}
/* eslint-enable no-unused-vars */

export function UserEditDialog({
  open,
  detail,
  voices,
  loading,
  submitting,
  onClose,
  onSubmit,
}: UserEditDialogProps) {
  const [value, setValue] = useState<UserEditValues>(createInitialValues(detail));

  useEffect(() => {
    setValue(createInitialValues(detail));
  }, [detail, open]);

  return (
    <AdminModal
      open={open}
      title="Edit User"
      description={
        detail ? `Update base learning information for ${detail.user.email}.` : undefined
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(value)}
            disabled={loading || submitting || !detail}
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-[var(--color-body)]">Loading user details...</p>
      ) : detail ? (
        <UserEditForm value={value} voices={voices} onChange={setValue} />
      ) : (
        <p className="text-sm text-[var(--color-body)]">
          User detail could not be loaded.
        </p>
      )}
    </AdminModal>
  );
}
