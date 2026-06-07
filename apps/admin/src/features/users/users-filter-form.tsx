import { Button } from "@learn-chinese-ai/ui";
import { AdminFormField } from "../../components/admin/admin-form-field";
import { AdminPageToolbar } from "../../components/admin/admin-page-toolbar";
import type { UsersFilters } from "./users.types";

/* eslint-disable no-unused-vars */
interface UsersFilterFormProps {
  value: UsersFilters;
  loading: boolean;
  onChange(next: UsersFilters): void;
  onSubmit: () => void;
  onReset: () => void;
}
/* eslint-enable no-unused-vars */

export function UsersFilterForm({
  value,
  loading,
  onChange,
  onSubmit,
  onReset,
}: UsersFilterFormProps) {
  return (
    <AdminPageToolbar>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto_auto]">
        <AdminFormField
          label="Name or Email"
          layout="inline"
          labelClassName="min-w-[7.5rem]"
        >
          <input
            value={value.keyword}
            onChange={(event) =>
              onChange({
                ...value,
                keyword: event.target.value,
              })
            }
            placeholder="Search by display name or email"
            className="h-12 w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
        <AdminFormField
          label="Created From"
          layout="inline"
          labelClassName="min-w-[7rem]"
        >
          <input
            type="date"
            value={value.createdFrom}
            onChange={(event) =>
              onChange({
                ...value,
                createdFrom: event.target.value,
              })
            }
            className="h-12 w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
        <AdminFormField label="Created To" layout="inline" labelClassName="min-w-[6rem]">
          <input
            type="date"
            value={value.createdTo}
            onChange={(event) =>
              onChange({
                ...value,
                createdTo: event.target.value,
              })
            }
            className="h-12 w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 text-sm text-[var(--color-ink)]"
          />
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
      </div>
    </AdminPageToolbar>
  );
}
