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
export const practiceDifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);
export const transcriptRoleSchema = z.enum(["user", "assistant", "system"]);
export const contentTypeSchema = z.enum(["partial", "final"]);
export const realtimeAudioFormatSchema = z.enum(["pcm16"]);
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
export const historyReportStateSchema = z.enum(["score", "no_report", "pending"]);
export const realtimeTransportSchema = z.enum(["doubao", "mock", "websocket"]);

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
  difficulty: practiceDifficultySchema,
  cover: z.string(),
  goal: z.string(),
  mode: practiceModeSchema,
  roles: z.array(scenarioRoleSchema),
  defaultRoleId: z.string(),
  openingLine: z.string(),
  openingLinesByRoleId: z.record(z.string(), z.string()),
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
  difficulty: practiceDifficultySchema.optional(),
  mode: practiceModeSchema.optional(),
  visitorToken: z.string().optional(),
});

export const realtimeProviderSessionSchema = z.object({
  transport: z.literal("websocket"),
  model: z.string(),
  sessionToken: z.string(),
  voiceId: z.string(),
  websocketPath: z.string(),
  inputAudioFormat: realtimeAudioFormatSchema,
  outputAudioFormat: realtimeAudioFormatSchema,
  inputSampleRate: z.number(),
  outputSampleRate: z.number(),
  vadSilenceMs: z.number(),
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
  generateReport: z.boolean().optional(),
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
  difficulty: practiceDifficultySchema,
  reportState: historyReportStateSchema,
});

export const historyListResponseSchema = z.object({
  items: z.array(conversationSummarySchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
});

export const scenarioListResponseSchema = z.object({
  items: z.array(practiceScenarioSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
});

export const conversationDetailSchema = conversationSummarySchema.extend({
  visitorToken: z.string(),
  goal: z.string(),
  transcript: z.array(messageItemSchema),
});

export const reportIssueSchema = z.object({
  original: z.string(),
  problem: z.string(),
  better: z.string(),
  note: z.string(),
});

export const reportSummarySchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  status: reportStatusSchema,
  title: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  issues: z.array(reportIssueSchema),
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

export const reportDetailSchema = z.object({
  conversation: z.object({
    id: z.string(),
    scenarioId: scenarioIdSchema,
    scenarioType: scenarioTypeSchema,
    title: z.string(),
    startedAt: z.string(),
    endedAt: z.string(),
    status: conversationStatusSchema,
    score: z.number(),
    roleName: z.string(),
    difficulty: practiceDifficultySchema,
    reportState: historyReportStateSchema,
    goal: z.string(),
    durationSeconds: z.number(),
  }),
  transcript: z.array(messageItemSchema),
  report: reportSummarySchema.nullable(),
});

export type PracticeScenarioSchema = z.infer<typeof practiceScenarioSchema>;
export type RealtimeSessionRequestSchema = z.infer<typeof realtimeSessionRequestSchema>;
export type RealtimeSessionResponseSchema = z.infer<typeof realtimeSessionResponseSchema>;
export type ConversationReplySchema = z.infer<typeof conversationReplySchema>;
export type HistoryListResponseSchema = z.infer<typeof historyListResponseSchema>;
export type ScenarioListResponseSchema = z.infer<typeof scenarioListResponseSchema>;
export type ConversationSummarySchema = z.infer<typeof conversationSummarySchema>;
export type ConversationDetailSchema = z.infer<typeof conversationDetailSchema>;
export type ReportIssueSchema = z.infer<typeof reportIssueSchema>;
export type ReportSummarySchema = z.infer<typeof reportSummarySchema>;
export type ReportDetailSchema = z.infer<typeof reportDetailSchema>;
