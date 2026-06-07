import { Button } from "@learn-chinese-ai/ui";
import { AdminFormField } from "../../components/admin/admin-form-field";
import { AdminPageToolbar } from "../../components/admin/admin-page-toolbar";
import { scenarioDifficultyOptions, scenarioTypeOptions } from "./scenarios.constants";
import type { ScenariosFilters } from "./scenarios.types";

/* eslint-disable no-unused-vars */
interface ScenariosFilterFormProps {
  value: ScenariosFilters;
  loading: boolean;
  onChange(next: ScenariosFilters): void;
  onSubmit: () => void;
  onReset: () => void;
  onCreate: () => void;
}
/* eslint-enable no-unused-vars */

export function ScenariosFilterForm({
  value,
  loading,
  onChange,
  onSubmit,
  onReset,
  onCreate,
}: ScenariosFilterFormProps) {
  return (
    <AdminPageToolbar>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.8fr_0.8fr_auto_auto_auto]">
        <AdminFormField label="Title">
          <input
            value={value.title}
            onChange={(event) =>
              onChange({
                ...value,
                title: event.target.value,
              })
            }
            placeholder="Search by scenario title"
            className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
        <AdminFormField label="Difficulty">
          <select
            value={value.difficulty}
            onChange={(event) =>
              onChange({
                ...value,
                difficulty: event.target.value,
              })
            }
            className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
          >
            <option value="">All difficulties</option>
            {scenarioDifficultyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField label="Type">
          <select
            value={value.type}
            onChange={(event) =>
              onChange({
                ...value,
                type: event.target.value,
              })
            }
            className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
          >
            <option value="">All types</option>
            {scenarioTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <div className="flex items-end">
          <Button className="w-full" shape="pill" disabled={loading} onClick={onSubmit}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            variant="secondary"
            shape="pill"
            disabled={loading}
            onClick={onReset}
          >
            Reset
          </Button>
        </div>
        <div className="flex items-end">
          <Button className="w-full" variant="ghost" shape="pill" onClick={onCreate}>
            New Scenario
          </Button>
        </div>
      </div>
    </AdminPageToolbar>
  );
}
