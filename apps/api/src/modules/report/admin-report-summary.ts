import type {
  AdminReportListItem,
  PracticeDifficulty,
  ReportStatus,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";
import { calculateConversationScore } from "../history/history-summary";
import { resolveAdminConversationUserDisplay } from "../conversation/admin-conversation-summary";

interface AdminReportScenarioLike {
  title: string;
  type: ScenarioType;
  difficulty: PracticeDifficulty;
}

interface AdminReportRoleLike {
  name: string;
}

interface AdminReportUserLike {
  id: string;
  email: string;
  displayName: string;
}

interface BuildAdminReportListItemInput {
  id: string;
  conversationId: string;
  title: string;
  status: ReportStatus;
  generatedAt: Date | string;
  scenario: AdminReportScenarioLike;
  selectedRole: AdminReportRoleLike;
  selectedDifficulty?: PracticeDifficulty | null;
  user?: AdminReportUserLike | null;
  scores: {
    grammarScore: number;
    vocabularyScore: number;
    fluencyScore: number;
    pronunciationScore: number;
    toneScore: number;
    naturalnessScore: number;
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

export function buildAdminReportListItem(
  input: BuildAdminReportListItemInput
): AdminReportListItem {
  return {
    id: input.id,
    conversationId: input.conversationId,
    title: input.title,
    scenarioTitle: input.scenario.title,
    scenarioType: input.scenario.type,
    userDisplay: resolveAdminConversationUserDisplay({
      user: input.user,
    }),
    roleName: input.selectedRole.name,
    difficulty: input.selectedDifficulty ?? input.scenario.difficulty,
    score: calculateConversationScore(input.scores),
    status: input.status,
    generatedAt: toIsoString(input.generatedAt),
  };
}
