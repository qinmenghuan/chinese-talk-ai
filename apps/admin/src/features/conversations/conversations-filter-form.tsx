import { Button } from "@learn-chinese-ai/ui";
import { AdminFormField } from "../../components/admin/admin-form-field";
import { AdminPageToolbar } from "../../components/admin/admin-page-toolbar";
import { conversationTypeOptions } from "./conversations.constants";
import type { ConversationsFilters } from "./conversations.types";

/* eslint-disable no-unused-vars */
interface ConversationsFilterFormProps {
  value: ConversationsFilters;
  loading: boolean;
  onChange(next: ConversationsFilters): void;
  onSubmit: () => void;
  onReset: () => void;
}
/* eslint-enable no-unused-vars */

export function ConversationsFilterForm({
  value,
  loading,
  onChange,
  onSubmit,
  onReset,
}: ConversationsFilterFormProps) {
  return (
    <AdminPageToolbar>
      <div className="grid gap-4 xl:grid-cols-[0.8fr_0.8fr_1fr_1.2fr_0.8fr_auto_auto]">
        <AdminFormField
          label="Started From"
          layout="inline"
          labelClassName="min-w-[7.5rem]"
        >
          <input
            type="date"
            value={value.startedFrom}
            onChange={(event) =>
              onChange({
                ...value,
                startedFrom: event.target.value,
              })
            }
            className="h-12 w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
        <AdminFormField
          label="Started To"
          layout="inline"
          labelClassName="min-w-[6.5rem]"
        >
          <input
            type="date"
            value={value.startedTo}
            onChange={(event) =>
              onChange({
                ...value,
                startedTo: event.target.value,
              })
            }
            className="h-12 w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
        <AdminFormField label="User" layout="inline" labelClassName="min-w-[4rem]">
          <input
            value={value.userKeyword}
            onChange={(event) =>
              onChange({
                ...value,
                userKeyword: event.target.value,
              })
            }
            placeholder="Search by user or visitor hash"
            className="h-12 w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
        <AdminFormField label="Title" layout="inline" labelClassName="min-w-[4rem]">
          <input
            value={value.title}
            onChange={(event) =>
              onChange({
                ...value,
                title: event.target.value,
              })
            }
            placeholder="Search by conversation title"
            className="h-12 w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 text-sm text-[var(--color-ink)]"
          />
        </AdminFormField>
        <AdminFormField label="Type" layout="inline" labelClassName="min-w-[4rem]">
          <select
            value={value.type}
            onChange={(event) =>
              onChange({
                ...value,
                type: event.target.value,
              })
            }
            className="h-12 w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 text-sm text-[var(--color-ink)]"
          >
            <option value="">All types</option>
            {conversationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <div className="flex items-end">
          <Button className="w-full" disabled={loading} onClick={onSubmit}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            variant="secondary"
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
