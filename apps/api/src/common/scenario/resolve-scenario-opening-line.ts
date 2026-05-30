import type { PracticeScenario } from "@learn-chinese-ai/shared-types";

export function resolveScenarioOpeningLine(
  scenario: PracticeScenario,
  selectedRoleId?: string
) {
  const effectiveRoleId = selectedRoleId ?? scenario.defaultRoleId;

  return scenario.openingLinesByRoleId[effectiveRoleId] ?? scenario.openingLine;
}
