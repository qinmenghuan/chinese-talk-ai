import { Button } from "@learn-chinese-ai/ui";
import { useEffect, useState } from "react";
import { AdminModal } from "../../components/admin/admin-modal";
import { ScenarioEditForm } from "./scenario-edit-form";
import {
  defaultScenarioEditValues,
  type ScenarioEditValues,
  type ScenarioListItem,
} from "./scenarios.types";

function createInitialValues(item: ScenarioListItem | null): ScenarioEditValues {
  if (!item) {
    return defaultScenarioEditValues;
  }

  return {
    title: item.title,
    type: item.type,
    difficulty: item.difficulty,
    imageUrl: item.imageUrl,
  };
}

/* eslint-disable no-unused-vars */
interface ScenarioEditDialogProps {
  open: boolean;
  item: ScenarioListItem | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit(next: ScenarioEditValues): void;
}
/* eslint-enable no-unused-vars */

export function ScenarioEditDialog({
  open,
  item,
  submitting,
  onClose,
  onSubmit,
}: ScenarioEditDialogProps) {
  const [value, setValue] = useState<ScenarioEditValues>(createInitialValues(item));

  useEffect(() => {
    setValue(createInitialValues(item));
  }, [item, open]);

  const isValid = value.title.trim().length > 0 && value.imageUrl.trim().length > 0;

  return (
    <AdminModal
      open={open}
      title={item ? "Edit Scenario" : "New Scenario"}
      description={
        item
          ? `Update the base information for "${item.title}".`
          : "Create a new conversation scenario for the admin catalog."
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(value)} disabled={submitting || !isValid}>
            {submitting ? "Saving..." : item ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <ScenarioEditForm value={value} onChange={setValue} />
    </AdminModal>
  );
}
