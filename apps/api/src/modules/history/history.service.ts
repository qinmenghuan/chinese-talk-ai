import { Injectable } from "@nestjs/common";
import type { ConversationSummary } from "@learn-chinese-ai/shared-types";

@Injectable()
export class HistoryService {
  list(): ConversationSummary[] {
    return [
      {
        id: "conv-001",
        scenarioType: "daily",
        title: "Coffee shop warm-up",
        startedAt: "2026-05-22 09:10",
        endedAt: "2026-05-22 09:21",
        score: 82,
      },
      {
        id: "conv-002",
        scenarioType: "interview",
        title: "Job interview practice",
        startedAt: "2026-05-21 20:00",
        endedAt: "2026-05-21 20:14",
        score: 88,
      },
    ];
  }
}
