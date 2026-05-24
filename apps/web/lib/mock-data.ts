import type {
  ConversationSummary,
  ReportSummary,
  Scenario,
} from "@learn-chinese-ai/shared-types";

export const scenarios: Scenario[] = [
  {
    id: "daily-cafe",
    type: "daily",
    title: "Daily small talk",
    subtitle: "Order coffee, greet a friend, and keep the conversation moving.",
    difficulty: "beginner",
    cover:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "interview-intro",
    type: "interview",
    title: "Interview self-introduction",
    subtitle: "Practice concise answers with stronger confidence and structure.",
    difficulty: "intermediate",
    cover:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "travel-hotel",
    type: "travel",
    title: "Hotel check-in",
    subtitle: "Handle travel questions, requests, and polite follow-up phrases.",
    difficulty: "beginner",
    cover:
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "business-meeting",
    type: "business",
    title: "Business meeting opener",
    subtitle: "Warm opening, agenda setting, and polite clarification in Chinese.",
    difficulty: "advanced",
    cover:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
  },
];

export const historyItems: ConversationSummary[] = [
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
  {
    id: "conv-003",
    scenarioType: "travel",
    title: "Airport question handling",
    startedAt: "2026-05-20 18:40",
    endedAt: "2026-05-20 18:52",
    score: 79,
  },
];

export const report: ReportSummary = {
  id: "rep-001",
  conversationId: "conv-002",
  summary:
    "You maintained a stable interview rhythm and expressed your main ideas clearly. The next improvement point is making transitions more natural and reducing direct word-for-word translation from English.",
  strengths: [
    "Self-introduction structure was clear and easy to follow.",
    "Vocabulary for work experience was appropriate and accurate.",
    "You handled follow-up questions without long pauses.",
  ],
  issues: [
    "Sentence endings sounded too literal in two places.",
    "You repeated the same transition phrase too often.",
    "Pronunciation of retroflex sounds still needs targeted practice.",
  ],
  suggestions: [
    "Practice three alternative transition phrases for interview answers.",
    "Record and compare your pronunciation of 'zhi', 'chi', and 'shi'.",
    "Answer the same question again in shorter sentences to sound more natural.",
  ],
  grammarScore: 84,
  vocabularyScore: 87,
  fluencyScore: 82,
  pronunciationScore: 76,
  naturalnessScore: 79,
};
