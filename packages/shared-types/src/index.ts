export type ScenarioType = "daily" | "interview" | "travel" | "business";

export type ScenarioId =
  | "daily-cafe"
  | "interview-intro"
  | "travel-hotel"
  | "business-meeting"
  | "free-chat";

export type PracticeMode = "scenario" | "free";
export type TranscriptRole = "user" | "assistant" | "system";
export type ContentType = "partial" | "final";
export type ConversationStatus =
  | "created"
  | "connecting"
  | "active"
  | "paused"
  | "ending"
  | "ended"
  | "report_pending"
  | "report_ready"
  | "failed";
export type ReportStatus = "pending" | "processing" | "ready" | "failed";
export type RealtimeTransport = "doubao" | "mock" | "rtc_ai";

export interface ScenarioRole {
  id: string;
  code: string;
  name: string;
  description: string;
  isAiRole: boolean;
}

export interface PracticeScenario {
  id: ScenarioId;
  type: ScenarioType;
  title: string;
  subtitle: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  cover: string;
  goal: string;
  mode: PracticeMode;
  roles: ScenarioRole[];
  defaultRoleId: string;
  openingLine: string;
  promptHint: string;
}

export interface MessageItem {
  id: string;
  role: TranscriptRole;
  content: string;
  contentType: ContentType;
  createdAt: string;
}

export interface RealtimeSessionRequest {
  scenarioId?: ScenarioId;
  roleId?: string;
  mode?: PracticeMode;
  visitorToken?: string;
}

export interface RealtimeProviderSession {
  transport: RealtimeTransport;
  appId: string;
  model: string;
  sessionToken: string;
  voiceId: string;
  expiresInSeconds: number;
}

export interface RealtimeRtcSession {
  appId: string;
  roomId: string;
  userId: string;
  token: string;
  botUserId: string;
  expiresInSeconds: number;
}

export interface RealtimeVoiceChatSession {
  provider: "volcengine-rtc-ai";
  taskId: string;
  botUserId: string;
  status: "starting" | "ready" | "failed";
  subtitleEnabled: boolean;
  errorMessage?: string;
}

export interface StartRealtimeVoiceChatRequest {
  roomId: string;
  userId: string;
  botUserId: string;
}

export interface RealtimeSessionResponse {
  provider: "doubao";
  anonymousSessionId: string;
  conversationId: string;
  visitorToken: string;
  scenario: PracticeScenario;
  selectedRole: ScenarioRole;
  conversationStatus: ConversationStatus;
  initialTranscript: MessageItem[];
  providerSession: RealtimeProviderSession;
  rtc: RealtimeRtcSession;
  voiceChat: RealtimeVoiceChatSession;
}

export interface CreateConversationReplyRequest {
  content: string;
}

export interface ConversationReply {
  userMessage: MessageItem;
  assistantMessage: MessageItem;
  conversationStatus: ConversationStatus;
}

export interface ConversationCloseResponse {
  id: string;
  status: ConversationStatus;
  savedMessages: number;
  reportStatus: ReportStatus;
}

export interface ConversationSummary {
  id: string;
  scenarioId: ScenarioId;
  scenarioType: ScenarioType;
  title: string;
  startedAt: string;
  endedAt: string;
  status: ConversationStatus;
  score: number;
  roleName: string;
}

export interface ConversationDetail extends ConversationSummary {
  visitorToken: string;
  goal: string;
  transcript: MessageItem[];
}

export interface ReportSummary {
  id: string;
  conversationId: string;
  status: ReportStatus;
  title: string;
  summary: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  toneScore: number;
  naturalnessScore: number;
  pdfFileName: string;
  generatedAt: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
