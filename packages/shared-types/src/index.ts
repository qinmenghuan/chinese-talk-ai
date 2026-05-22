export type ScenarioType = "daily" | "interview" | "travel" | "business";

export interface Scenario {
  id: string;
  type: ScenarioType;
  title: string;
  subtitle: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  cover: string;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentType: "partial" | "final";
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  scenarioType: ScenarioType;
  title: string;
  startedAt: string;
  endedAt: string;
  score: number;
}

export interface ReportSummary {
  id: string;
  conversationId: string;
  summary: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  naturalnessScore: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
