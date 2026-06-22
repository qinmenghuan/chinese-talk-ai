import type {
  ConversationStatus,
  HistoryListResponse,
  ConversationSummary,
  PracticeDifficulty,
  ScenarioId,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";

export const DEFAULT_HISTORY_PAGE_SIZE = 20;

interface HistoryScenarioLike {
  id: ScenarioId;
  type: ScenarioType;
  title: string;
  difficulty: PracticeDifficulty;
}

interface HistoryRoleLike {
  name: string;
}

interface HistoryReportLike {
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  toneScore: number;
  naturalnessScore: number;
}

interface BuildConversationSummaryInput {
  id: string;
  scenario: HistoryScenarioLike;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  status: ConversationStatus;
  selectedRole: HistoryRoleLike;
  selectedDifficulty?: PracticeDifficulty | null;
  report?: HistoryReportLike | null;
}

export function calculateConversationScore(report?: HistoryReportLike | null) {
  if (!report) {
    return 0;
  }

  return Math.round(
    (report.grammarScore +
      report.vocabularyScore +
      report.fluencyScore +
      report.pronunciationScore +
      report.toneScore +
      report.naturalnessScore) /
      6
  );
}

export function resolveHistoryReportState(input: {
  status: ConversationStatus;
  report?: HistoryReportLike | null;
}) {
  if (input.report) {
    return "score" as const;
  }

  if (input.status === "ended") {
    return "no_report" as const;
  }

  return "pending" as const;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

export function buildConversationSummary(
  input: BuildConversationSummaryInput
): ConversationSummary {
  const score = calculateConversationScore(input.report);

  return {
    id: input.id,
    scenarioId: input.scenario.id,
    scenarioType: input.scenario.type,
    title: input.scenario.title,
    startedAt: toIsoString(input.startedAt),
    endedAt: toIsoString(input.endedAt ?? input.startedAt),
    status: input.status,
    score,
    roleName: input.selectedRole.name,
    difficulty: input.selectedDifficulty ?? input.scenario.difficulty,
    reportState: resolveHistoryReportState({
      status: input.status,
      report: input.report,
    }),
  };
}

export function buildHistoryListResponse(input: {
  items: ConversationSummary[];
  page: number;
  pageSize: number;
  total: number;
}): HistoryListResponse {
  return {
    items: input.items,
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
    hasMore: input.page * input.pageSize < input.total,
  };
}
