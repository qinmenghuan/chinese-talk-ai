import { z } from "zod";

export const scenarioTypeSchema = z.enum(["daily", "interview", "travel", "business"]);

export const scenarioSchema = z.object({
  id: z.string(),
  type: scenarioTypeSchema,
  title: z.string(),
  subtitle: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  cover: z.string(),
});

export const messageItemSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  contentType: z.enum(["partial", "final"]),
  createdAt: z.string(),
});

export const conversationSummarySchema = z.object({
  id: z.string(),
  scenarioType: scenarioTypeSchema,
  title: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  score: z.number(),
});

export const reportSummarySchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  grammarScore: z.number(),
  vocabularyScore: z.number(),
  fluencyScore: z.number(),
  pronunciationScore: z.number(),
  naturalnessScore: z.number(),
});

export const createRealtimeSessionSchema = z.object({
  scenarioType: scenarioTypeSchema,
});

export const endConversationSchema = z.object({
  transcript: z.array(messageItemSchema),
});

export type ScenarioSchema = z.infer<typeof scenarioSchema>;
export type ReportSummarySchema = z.infer<typeof reportSummarySchema>;
