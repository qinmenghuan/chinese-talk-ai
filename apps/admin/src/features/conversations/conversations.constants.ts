import type {
  ConversationStatus,
  HistoryReportState,
  PracticeDifficulty,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";

export const conversationTypeOptions: Array<{ value: ScenarioType; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "interview", label: "Interview" },
  { value: "travel", label: "Travel" },
  { value: "business", label: "Business" },
];

export function formatConversationType(value: ScenarioType) {
  return conversationTypeOptions.find((item) => item.value === value)?.label ?? value;
}

export function formatConversationDifficulty(value: PracticeDifficulty) {
  const labels: Record<PracticeDifficulty, string> = {
    beginner: "Low",
    intermediate: "Medium",
    advanced: "High",
  };

  return labels[value];
}

export function formatConversationStatus(value: ConversationStatus) {
  const labels: Record<ConversationStatus, string> = {
    created: "Created",
    connecting: "Connecting",
    active: "Active",
    paused: "Paused",
    ending: "Ending",
    ended: "Ended",
    report_pending: "Report Pending",
    report_ready: "Report Ready",
    failed: "Failed",
  };

  return labels[value];
}

export function formatConversationReportState(value: HistoryReportState) {
  const labels: Record<HistoryReportState, string> = {
    score: "Ready",
    no_report: "No Report",
    pending: "Pending",
  };

  return labels[value];
}
