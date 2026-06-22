import { AdminFormField } from "../../components/admin/admin-form-field";
import { scenarioDifficultyOptions, scenarioTypeOptions } from "./scenarios.constants";
import type { ScenarioEditValues } from "./scenarios.types";

/* eslint-disable no-unused-vars */
interface ScenarioEditFormProps {
  value: ScenarioEditValues;
  onChange(next: ScenarioEditValues): void;
}
/* eslint-enable no-unused-vars */

export function ScenarioEditForm({ value, onChange }: ScenarioEditFormProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <AdminFormField label="Title">
          <input
            value={value.title}
            onChange={(event) =>
              onChange({
                ...value,
                title: event.target.value,
              })
            }
            placeholder="e.g. Buy a Plane Ticket"
            className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
      </div>
      <AdminFormField label="Type">
        <select
          value={value.type}
          onChange={(event) =>
            onChange({
              ...value,
              type: event.target.value as ScenarioEditValues["type"],
            })
          }
          className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          {scenarioTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </AdminFormField>
      <AdminFormField label="Difficulty">
        <select
          value={value.difficulty}
          onChange={(event) =>
            onChange({
              ...value,
              difficulty: event.target.value as ScenarioEditValues["difficulty"],
            })
          }
          className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          {scenarioDifficultyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </AdminFormField>
      <div className="md:col-span-2">
        <AdminFormField label="Image URL">
          <input
            value={value.imageUrl}
            onChange={(event) =>
              onChange({
                ...value,
                imageUrl: event.target.value,
              })
            }
            placeholder="https://..."
            className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
      </div>
    </div>
  );
}
