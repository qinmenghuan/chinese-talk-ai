import type {
  PracticeDifficulty,
  ReportStatus,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";

export const reportTypeOptions: Array<{ value: ScenarioType; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "interview", label: "Interview" },
  { value: "travel", label: "Travel" },
  { value: "business", label: "Business" },
];

export const reportScoreLabels = [
  ["Grammar", "grammarScore"],
  ["Vocabulary", "vocabularyScore"],
  ["Fluency", "fluencyScore"],
  ["Pronunciation", "pronunciationScore"],
  ["Tone", "toneScore"],
  ["Naturalness", "naturalnessScore"],
] as const;

export function formatReportType(value: ScenarioType) {
  return reportTypeOptions.find((item) => item.value === value)?.label ?? value;
}

export function formatReportDifficulty(value: PracticeDifficulty) {
  const labels: Record<PracticeDifficulty, string> = {
    beginner: "Low",
    intermediate: "Medium",
    advanced: "High",
  };

  return labels[value];
}

export function formatReportStatus(value: ReportStatus) {
  const labels: Record<ReportStatus, string> = {
    pending: "Pending",
    processing: "Processing",
    ready: "Ready",
    failed: "Failed",
  };

  return labels[value];
}
