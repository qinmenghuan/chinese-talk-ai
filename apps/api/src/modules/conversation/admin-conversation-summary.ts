import type {
  AdminConversationListItem,
  ConversationStatus,
  HistoryReportState,
  PracticeDifficulty,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";
import { resolveHistoryReportState } from "../history/history-summary";

interface AdminConversationScenarioLike {
  title: string;
  type: ScenarioType;
  difficulty: PracticeDifficulty;
}

interface AdminConversationRoleLike {
  name: string;
}

interface AdminConversationUserLike {
  id: string;
  email: string;
  displayName: string;
}

interface AdminConversationAnonymousSessionLike {
  visitorTokenHash: string;
}

interface AdminConversationReportLike {
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  toneScore: number;
  naturalnessScore: number;
}

interface BuildAdminConversationListItemInput {
  id: string;
  scenario: AdminConversationScenarioLike;
  selectedRole: AdminConversationRoleLike;
  selectedDifficulty?: PracticeDifficulty | null;
  user?: AdminConversationUserLike | null;
  anonymousSession?: AdminConversationAnonymousSessionLike | null;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  status: ConversationStatus;
  report?: AdminConversationReportLike | null;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

export function resolveAdminConversationUserDisplay(input: {
  user?: AdminConversationUserLike | null;
  anonymousSession?: AdminConversationAnonymousSessionLike | null;
}) {
  if (input.user) {
    const displayName = input.user.displayName.trim();
    const email = input.user.email.trim();

    if (displayName && email) {
      return `${displayName} · ${email}`;
    }

    return displayName || email || input.user.id;
  }

  if (input.anonymousSession?.visitorTokenHash) {
    return `Anonymous · ${input.anonymousSession.visitorTokenHash.slice(0, 12)}`;
  }

  return "Unknown";
}

export function buildAdminConversationListItem(
  input: BuildAdminConversationListItemInput
): AdminConversationListItem {
  const reportState: HistoryReportState = resolveHistoryReportState({
    status: input.status,
    report: input.report,
  });

  return {
    id: input.id,
    title: input.scenario.title,
    scenarioType: input.scenario.type,
    difficulty: input.selectedDifficulty ?? input.scenario.difficulty,
    roleName: input.selectedRole.name,
    userDisplay: resolveAdminConversationUserDisplay({
      user: input.user,
      anonymousSession: input.anonymousSession,
    }),
    startedAt: toIsoString(input.startedAt),
    endedAt: input.endedAt ? toIsoString(input.endedAt) : null,
    status: input.status,
    reportState,
  };
}
