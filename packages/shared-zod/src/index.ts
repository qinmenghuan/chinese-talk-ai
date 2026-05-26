import { z } from "zod";

export const scenarioTypeSchema = z.enum(["daily", "interview", "travel", "business"]);
export const scenarioIdSchema = z.enum([
  "daily-cafe",
  "interview-intro",
  "travel-hotel",
  "business-meeting",
  "free-chat",
]);
export const practiceModeSchema = z.enum(["scenario", "free"]);
export const transcriptRoleSchema = z.enum(["user", "assistant", "system"]);
export const contentTypeSchema = z.enum(["partial", "final"]);
export const conversationStatusSchema = z.enum([
  "created",
  "connecting",
  "active",
  "paused",
  "ending",
  "ended",
  "report_pending",
  "report_ready",
  "failed",
]);
export const reportStatusSchema = z.enum(["pending", "processing", "ready", "failed"]);
export const realtimeTransportSchema = z.enum(["doubao", "mock"]);

export const scenarioRoleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  isAiRole: z.boolean(),
});

export const practiceScenarioSchema = z.object({
  id: scenarioIdSchema,
  type: scenarioTypeSchema,
  title: z.string(),
  subtitle: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  cover: z.string(),
  goal: z.string(),
  mode: practiceModeSchema,
  roles: z.array(scenarioRoleSchema),
  defaultRoleId: z.string(),
  openingLine: z.string(),
  promptHint: z.string(),
});

export const messageItemSchema = z.object({
  id: z.string(),
  role: transcriptRoleSchema,
  content: z.string(),
  contentType: contentTypeSchema,
  createdAt: z.string(),
});

export const realtimeSessionRequestSchema = z.object({
  scenarioId: scenarioIdSchema.optional(),
  roleId: z.string().optional(),
  mode: practiceModeSchema.optional(),
  visitorToken: z.string().optional(),
});

export const realtimeProviderSessionSchema = z.object({
  transport: realtimeTransportSchema,
  appId: z.string(),
  model: z.string(),
  sessionToken: z.string(),
  voiceId: z.string(),
  expiresInSeconds: z.number(),
});

export const realtimeSessionResponseSchema = z.object({
  provider: z.literal("doubao"),
  anonymousSessionId: z.string(),
  conversationId: z.string(),
  visitorToken: z.string(),
  scenario: practiceScenarioSchema,
  selectedRole: scenarioRoleSchema,
  conversationStatus: conversationStatusSchema,
  initialTranscript: z.array(messageItemSchema),
  providerSession: realtimeProviderSessionSchema,
});

export const createConversationReplyRequestSchema = z.object({
  content: z.string().min(1),
});

export const conversationReplySchema = z.object({
  userMessage: messageItemSchema,
  assistantMessage: messageItemSchema,
  conversationStatus: conversationStatusSchema,
});

export const endConversationSchema = z.object({
  transcript: z.array(messageItemSchema),
});

export const conversationCloseResponseSchema = z.object({
  id: z.string(),
  status: conversationStatusSchema,
  savedMessages: z.number(),
  reportStatus: reportStatusSchema,
});

export const conversationSummarySchema = z.object({
  id: z.string(),
  scenarioId: scenarioIdSchema,
  scenarioType: scenarioTypeSchema,
  title: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  status: conversationStatusSchema,
  score: z.number(),
  roleName: z.string(),
});

export const conversationDetailSchema = conversationSummarySchema.extend({
  visitorToken: z.string(),
  goal: z.string(),
  transcript: z.array(messageItemSchema),
});

export const reportSummarySchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  status: reportStatusSchema,
  title: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  grammarScore: z.number(),
  vocabularyScore: z.number(),
  fluencyScore: z.number(),
  pronunciationScore: z.number(),
  toneScore: z.number(),
  naturalnessScore: z.number(),
  pdfFileName: z.string(),
  generatedAt: z.string(),
});

export type PracticeScenarioSchema = z.infer<typeof practiceScenarioSchema>;
export type RealtimeSessionRequestSchema = z.infer<typeof realtimeSessionRequestSchema>;
export type RealtimeSessionResponseSchema = z.infer<typeof realtimeSessionResponseSchema>;
export type ConversationReplySchema = z.infer<typeof conversationReplySchema>;
export type ConversationSummarySchema = z.infer<typeof conversationSummarySchema>;
export type ConversationDetailSchema = z.infer<typeof conversationDetailSchema>;
export type ReportSummarySchema = z.infer<typeof reportSummarySchema>;
