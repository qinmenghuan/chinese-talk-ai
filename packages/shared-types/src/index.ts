export type ScenarioType = "daily" | "interview" | "travel" | "business";
export type PracticeDifficulty = "beginner" | "intermediate" | "advanced";
export type UserStatus = "active" | "disabled";
export type AdminRole = "super_admin";
export type AuthActorType = "user" | "admin";

export type ScenarioId = string;

export type PracticeMode = "scenario" | "free";
export type TranscriptRole = "user" | "assistant" | "system";
export type ContentType = "partial" | "final";
export type RealtimeAudioFormat = "pcm16";
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
export type HistoryReportState = "score" | "no_report" | "pending";
export type RealtimeTransport = "doubao" | "mock" | "websocket";

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
  difficulty: PracticeDifficulty;
  cover: string;
  goal: string;
  mode: PracticeMode;
  roles: ScenarioRole[];
  defaultRoleId: string;
  openingLine: string;
  openingLinesByRoleId: Record<string, string>;
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
  difficulty?: PracticeDifficulty;
  mode?: PracticeMode;
  visitorToken?: string;
}

export interface RealtimeTicketRequest {
  conversationId: string;
}

export interface RealtimeTicketResponse {
  ticket: string;
  expiresInSeconds: number;
}

export interface RealtimeProviderSession {
  transport: "websocket";
  model: string;
  sessionToken: string;
  voiceId: string;
  websocketPath: string;
  inputAudioFormat: RealtimeAudioFormat;
  outputAudioFormat: RealtimeAudioFormat;
  inputSampleRate: number;
  outputSampleRate: number;
  vadSilenceMs: number;
  expiresInSeconds: number;
}

export interface RealtimeSessionResponse {
  provider: "doubao";
  anonymousSessionId: string;
  conversationId: string;
  visitorToken?: string;
  scenario: PracticeScenario;
  selectedRole: ScenarioRole;
  conversationStatus: ConversationStatus;
  initialTranscript: MessageItem[];
  providerSession: RealtimeProviderSession;
}

export interface UserPreference {
  proficiencyLevel: PracticeDifficulty;
  learningGoal: ScenarioType;
  preferredVoiceId: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
}

export interface AuthSessionUser {
  user: UserProfile;
  preference: UserPreference;
  accessToken: string;
  expiresInSeconds: number;
}

export interface UpdateUserPreferenceRequest {
  displayName?: string;
  proficiencyLevel: PracticeDifficulty;
  learningGoal: ScenarioType;
  preferredVoiceId: string | null;
}

export interface AdminSessionUser {
  admin: {
    id: string;
    username: string;
    role: AdminRole;
    status: UserStatus;
  };
  accessToken: string;
  expiresInSeconds: number;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface VoiceOption {
  id: string;
  label: string;
  gender: "female" | "male" | "neutral" | null;
  locale: string;
  isDefault: boolean;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  preference: UserPreference;
}

export interface AdminUserDetail {
  user: AdminUserListItem;
}

export interface AdminUserListResponse {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface AdminUpdateUserRequest {
  displayName?: string;
  proficiencyLevel: PracticeDifficulty;
  learningGoal: ScenarioType;
  preferredVoiceId: string | null;
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
  difficulty: PracticeDifficulty;
  reportState: HistoryReportState;
}

export interface HistoryListResponse {
  items: ConversationSummary[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ScenarioListResponse {
  items: PracticeScenario[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AdminScenarioListItem {
  id: string;
  title: string;
  type: ScenarioType;
  difficulty: PracticeDifficulty;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminScenarioListQuery {
  title?: string;
  type?: ScenarioType;
  difficulty?: PracticeDifficulty;
  page?: number;
  pageSize?: number;
}

export interface CreateAdminScenarioRequest {
  title: string;
  type: ScenarioType;
  difficulty: PracticeDifficulty;
  imageUrl: string;
}

export type UpdateAdminScenarioRequest = CreateAdminScenarioRequest;

export interface AdminScenarioListResponse {
  items: AdminScenarioListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface DeleteAdminScenarioResponse {
  success: true;
}

export interface ConversationDetail extends ConversationSummary {
  visitorToken: string;
  goal: string;
  transcript: MessageItem[];
}

export interface ReportIssue {
  original: string;
  problem: string;
  better: string;
  note: string;
}

export interface ReportSummary {
  id: string;
  conversationId: string;
  status: ReportStatus;
  title: string;
  summary: string;
  strengths: string[];
  issues: ReportIssue[];
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

export interface ReportDetail {
  conversation: {
    id: string;
    scenarioId: ScenarioId;
    scenarioType: ScenarioType;
    title: string;
    startedAt: string;
    endedAt: string;
    status: ConversationStatus;
    score: number;
    roleName: string;
    difficulty: PracticeDifficulty;
    reportState: HistoryReportState;
    goal: string;
    durationSeconds: number;
  };
  transcript: MessageItem[];
  report: ReportSummary | null;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
