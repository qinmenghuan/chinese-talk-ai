import { Injectable } from "@nestjs/common";
import type { ReportSummary } from "@learn-chinese-ai/shared-types";

@Injectable()
export class ReportService {
  getByConversationId(id: string): ReportSummary {
    return {
      id: "report-demo-001",
      conversationId: id,
      summary:
        "The learner sustained a clear response rhythm and used useful interview vocabulary with moderate confidence.",
      strengths: [
        "Clear self-introduction structure",
        "Relevant vocabulary for past experience",
      ],
      issues: [
        "Transitions sounded repetitive",
        "Pronunciation needs more retroflex practice",
      ],
      suggestions: [
        "Practice three transition alternatives",
        "Repeat key sounds in slower contrast drills",
      ],
      grammarScore: 84,
      vocabularyScore: 87,
      fluencyScore: 82,
      pronunciationScore: 76,
      naturalnessScore: 79,
    };
  }
}
