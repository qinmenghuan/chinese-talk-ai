"use client";

import type {
  PracticeDifficulty,
  RealtimeSessionResponse,
} from "@learn-chinese-ai/shared-types";
import { Card } from "@learn-chinese-ai/ui";

/* eslint-disable no-unused-vars */
interface SessionFocusProps {
  session: RealtimeSessionResponse | null;
  selectedRoleId: string;
  selectedDifficulty: PracticeDifficulty | "";
  canSwitchRole: boolean;
  canSwitchDifficulty: boolean;
  onRoleChange(roleId: string): void;
  onDifficultyChange(difficulty: PracticeDifficulty): void;
}
/* eslint-enable no-unused-vars */

const PRACTICE_DIFFICULTY_OPTIONS: Array<{
  value: PracticeDifficulty;
  label: string;
}> = [
  {
    value: "beginner",
    label: "Beginner",
  },
  {
    value: "intermediate",
    label: "Intermediate",
  },
  {
    value: "advanced",
    label: "Advanced",
  },
];

function getScenarioDifficultyLabel(difficulty?: PracticeDifficulty) {
  if (difficulty === "beginner") {
    return "Beginner";
  }

  if (difficulty === "intermediate") {
    return "Intermediate";
  }

  if (difficulty === "advanced") {
    return "Advanced";
  }

  return "Preparing";
}

export function SessionFocus({
  session,
  selectedRoleId,
  selectedDifficulty,
  canSwitchRole,
  canSwitchDifficulty,
  onRoleChange,
  onDifficultyChange,
}: SessionFocusProps) {
  return (
    <Card className="p-6 shadow-[var(--shadow-float)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        Session focus
      </p>
      <h3 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">
        {session?.scenario.goal ?? "Preparing goal"}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[var(--color-body)]">
        {session?.scenario.promptHint ??
          "The side rail stays light. It should support the conversation."}
      </p>
      <div className="mt-5 space-y-3 text-sm text-[var(--color-body)]">
        <label className="block rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Role
          </span>
          <select
            value={selectedRoleId}
            onChange={(event) => onRoleChange(event.target.value)}
            disabled={!canSwitchRole}
            className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {session?.scenario.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Difficulty
          </span>
          <select
            value={selectedDifficulty}
            onChange={(event) =>
              onDifficultyChange(event.target.value as PracticeDifficulty)
            }
            disabled={!canSwitchDifficulty}
            className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="" disabled>
              Preparing
            </option>
            {PRACTICE_DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
          Model: {session?.providerSession.model ?? "Preparing"}
        </div>
        <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
          Voice: {session?.providerSession.voiceId ?? "Preparing"}
        </div>
        <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
          Current difficulty: {getScenarioDifficultyLabel(session?.scenario.difficulty)}
        </div>
      </div>
    </Card>
  );
}
