import type { PracticeDifficulty, ScenarioType } from "@learn-chinese-ai/shared-types";

export const scenarioTypeOptions: Array<{ value: ScenarioType; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "interview", label: "Interview" },
  { value: "travel", label: "Travel" },
  { value: "business", label: "Business" },
];

export const scenarioDifficultyOptions: Array<{
  value: PracticeDifficulty;
  label: string;
}> = [
  { value: "beginner", label: "Low" },
  { value: "intermediate", label: "Medium" },
  { value: "advanced", label: "High" },
];

export function formatScenarioType(value: ScenarioType) {
  return scenarioTypeOptions.find((item) => item.value === value)?.label ?? value;
}

export function formatScenarioDifficulty(value: PracticeDifficulty) {
  return scenarioDifficultyOptions.find((item) => item.value === value)?.label ?? value;
}
