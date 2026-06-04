import type { VoiceOption } from "@learn-chinese-ai/shared-types";
import { AdminFormField } from "../../components/admin/admin-form-field";
import type { UserEditValues } from "./users.types";

/* eslint-disable no-unused-vars */
interface UserEditFormProps {
  value: UserEditValues;
  voices: VoiceOption[];
  onChange(next: UserEditValues): void;
}
/* eslint-enable no-unused-vars */

export function UserEditForm({ value, voices, onChange }: UserEditFormProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AdminFormField label="Display Name">
        <input
          value={value.displayName ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              displayName: event.target.value,
            })
          }
          className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
        />
      </AdminFormField>
      <AdminFormField label="Level">
        <select
          value={value.proficiencyLevel}
          onChange={(event) =>
            onChange({
              ...value,
              proficiencyLevel: event.target.value as UserEditValues["proficiencyLevel"],
            })
          }
          className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          <option value="beginner">Low</option>
          <option value="intermediate">Medium</option>
          <option value="advanced">High</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Learning Goal">
        <select
          value={value.learningGoal}
          onChange={(event) =>
            onChange({
              ...value,
              learningGoal: event.target.value as UserEditValues["learningGoal"],
            })
          }
          className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          <option value="daily">Daily</option>
          <option value="interview">Interview</option>
          <option value="travel">Travel</option>
          <option value="business">Business</option>
        </select>
      </AdminFormField>
      <AdminFormField label="Preferred Voice">
        <select
          value={value.preferredVoiceId ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              preferredVoiceId: event.target.value || null,
            })
          }
          className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.label}
            </option>
          ))}
        </select>
      </AdminFormField>
    </div>
  );
}
