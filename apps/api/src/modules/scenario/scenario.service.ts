import { Injectable } from "@nestjs/common";
import type { Scenario } from "@learn-chinese-ai/shared-types";

@Injectable()
export class ScenarioService {
  getScenarios(): Scenario[] {
    return [
      {
        id: "daily-cafe",
        type: "daily",
        title: "Daily small talk",
        subtitle: "Order coffee and keep the conversation warm.",
        difficulty: "beginner",
        cover: "daily-cafe.jpg",
      },
      {
        id: "interview-intro",
        type: "interview",
        title: "Interview self-introduction",
        subtitle: "Practice concise answers for formal settings.",
        difficulty: "intermediate",
        cover: "interview-intro.jpg",
      },
    ];
  }
}
