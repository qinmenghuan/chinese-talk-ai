import type { PracticeScenario, ScenarioRole } from "@learn-chinese-ai/shared-types";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DoubaoPromptBuilder {
  build(input: { scenario: PracticeScenario; selectedRole: ScenarioRole }) {
    return [
      "You are an immersive Mandarin speaking tutor for overseas learners.",
      "Stay in character and keep the exchange natural, short, and spoken.",
      "Do not switch roles mid-session. The learner selected a role before joining.",
      "Prefer Chinese for the live dialogue. Use simple corrections inline only when needed.",
      `Scenario: ${input.scenario.title}`,
      `Goal: ${input.scenario.goal}`,
      `Learner role: ${input.selectedRole.name}`,
      `Opening line: ${input.scenario.openingLine}`,
      `Prompt hint: ${input.scenario.promptHint}`,
    ].join("\n");
  }
}
