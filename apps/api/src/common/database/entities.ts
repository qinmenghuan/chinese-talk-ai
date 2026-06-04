import type {
  AdminRole,
  ContentType,
  ConversationStatus,
  PracticeDifficulty,
  PracticeMode,
  ReportIssue,
  ReportStatus,
  ScenarioId,
  ScenarioType,
  TranscriptRole,
  UserStatus,
} from "@learn-chinese-ai/shared-types";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";

@Entity("app_user")
@Index("idx_app_user_email_unique", ["email"], { unique: true })
export class UserEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ type: "varchar", length: 160 })
  email!: string;

  @Column({ name: "display_name", type: "varchar", length: 120 })
  displayName!: string;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl!: string | null;

  @Column({ type: "varchar", length: 16, default: "active" })
  status!: UserStatus;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => UserIdentityEntity, (identity) => identity.user, { cascade: false })
  identities!: Relation<UserIdentityEntity[]>;

  @OneToOne(() => UserPreferenceEntity, (preference) => preference.user, {
    cascade: false,
  })
  preference!: Relation<UserPreferenceEntity>;
}

@Entity("user_identity")
@Index("idx_user_identity_provider_unique", ["provider", "providerSubject"], {
  unique: true,
})
export class UserIdentityEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 64 })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.identities, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: Relation<UserEntity>;

  @Column({ type: "varchar", length: 32 })
  provider!: "google";

  @Column({ name: "provider_subject", type: "varchar", length: 191 })
  providerSubject!: string;

  @Column({ name: "provider_email", type: "varchar", length: 160 })
  providerEmail!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

@Entity("user_preference")
export class UserPreferenceEntity {
  @PrimaryColumn({ name: "user_id", type: "varchar", length: 64 })
  userId!: string;

  @OneToOne(() => UserEntity, (user) => user.preference, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: Relation<UserEntity>;

  @Column({ name: "proficiency_level", type: "varchar", length: 32 })
  proficiencyLevel!: PracticeDifficulty;

  @Column({ name: "learning_goal", type: "varchar", length: 32 })
  learningGoal!: ScenarioType;

  @Column({ name: "preferred_voice_id", type: "varchar", length: 120, nullable: true })
  preferredVoiceId!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("admin_user")
@Index("idx_admin_user_username_unique", ["username"], { unique: true })
export class AdminUserEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ type: "varchar", length: 80 })
  username!: string;

  @Column({ name: "password_hash", type: "varchar", length: 191 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 32, default: "super_admin" })
  role!: AdminRole;

  @Column({ type: "varchar", length: 16, default: "active" })
  status!: UserStatus;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("auth_session")
@Index("idx_auth_session_refresh_token_hash_unique", ["refreshTokenHash"], {
  unique: true,
})
export class AuthSessionEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "actor_type", type: "varchar", length: 16 })
  actorType!: "user" | "admin";

  @Column({ name: "actor_id", type: "varchar", length: 64 })
  actorId!: string;

  @Column({ name: "refresh_token_hash", type: "varchar", length: 128 })
  refreshTokenHash!: string;

  @Column({ name: "user_agent", type: "varchar", length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ name: "ip_address", type: "varchar", length: 120, nullable: true })
  ipAddress!: string | null;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("practice_scenario")
export class PracticeScenarioEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: ScenarioId;

  @Column({ type: "varchar", length: 32 })
  type!: ScenarioType;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "text" })
  subtitle!: string;

  @Column({ type: "varchar", length: 32 })
  mode!: PracticeMode;

  @Column({ type: "varchar", length: 32 })
  difficulty!: "beginner" | "intermediate" | "advanced";

  @Column({ type: "text" })
  goal!: string;

  @Column({ name: "cover_url", type: "text" })
  coverUrl!: string;

  @Column({ name: "default_role_id", type: "varchar", length: 64 })
  defaultRoleId!: string;

  @Column({ name: "opening_line", type: "text" })
  openingLine!: string;

  @Column({ name: "prompt_hint", type: "text" })
  promptHint!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => ScenarioRoleEntity, (role) => role.scenario, { cascade: false })
  roles!: Relation<ScenarioRoleEntity[]>;
}

@Entity("scenario_role")
export class ScenarioRoleEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "scenario_id", type: "varchar", length: 64 })
  scenarioId!: string;

  @ManyToOne(() => PracticeScenarioEntity, (scenario) => scenario.roles, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "scenario_id" })
  scenario!: Relation<PracticeScenarioEntity>;

  @Column({ type: "varchar", length: 32 })
  code!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ name: "is_ai_role", type: "boolean", default: false })
  isAiRole!: boolean;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("anonymous_session")
@Index("idx_anonymous_session_visitor_token_hash", ["visitorTokenHash"], { unique: true })
export class AnonymousSessionEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "visitor_token_hash", type: "varchar", length: 128 })
  visitorTokenHash!: string;

  @Column({
    name: "device_fingerprint_hash",
    type: "varchar",
    length: 128,
    nullable: true,
  })
  deviceFingerprintHash!: string | null;

  @Column({ type: "varchar", length: 64, default: "web" })
  source!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "last_seen_at", type: "timestamptz" })
  lastSeenAt!: Date;
}

@Entity("conversation")
@Index("idx_conversation_session_started_at", ["anonymousSessionId", "startedAt"])
@Index("idx_conversation_status", ["status"])
export class ConversationEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 64, nullable: true })
  userId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user!: Relation<UserEntity> | null;

  @Column({ name: "anonymous_session_id", type: "varchar", length: 64, nullable: true })
  anonymousSessionId!: string | null;

  @ManyToOne(() => AnonymousSessionEntity, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "anonymous_session_id" })
  anonymousSession!: Relation<AnonymousSessionEntity> | null;

  @Column({ name: "scenario_id", type: "varchar", length: 64 })
  scenarioId!: string;

  @ManyToOne(() => PracticeScenarioEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "scenario_id" })
  scenario!: Relation<PracticeScenarioEntity>;

  @Column({ name: "selected_role_id", type: "varchar", length: 64 })
  selectedRoleId!: string;

  @ManyToOne(() => ScenarioRoleEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "selected_role_id" })
  selectedRole!: Relation<ScenarioRoleEntity>;

  @Column({ type: "varchar", length: 32 })
  mode!: PracticeMode;

  @Column({ name: "selected_difficulty", type: "varchar", length: 32, nullable: true })
  selectedDifficulty!: PracticeDifficulty | null;

  @Column({ type: "varchar", length: 32, default: "volcengine-rtc-ai" })
  provider!: string;

  @Column({ name: "provider_room_id", type: "varchar", length: 128, nullable: true })
  providerRoomId!: string | null;

  @Column({ name: "provider_session_id", type: "varchar", length: 128, nullable: true })
  providerSessionId!: string | null;

  @Column({ type: "varchar", length: 32 })
  status!: ConversationStatus;

  @Column({ name: "started_at", type: "timestamptz" })
  startedAt!: Date;

  @Column({ name: "ended_at", type: "timestamptz", nullable: true })
  endedAt!: Date | null;

  @Column({ name: "duration_seconds", type: "int", default: 0 })
  durationSeconds!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("message")
@Index("idx_message_conversation_sequence", ["conversationId", "sequenceNo"], {
  unique: true,
})
export class MessageEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "conversation_id", type: "varchar", length: 64 })
  conversationId!: string;

  @ManyToOne(() => ConversationEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: Relation<ConversationEntity>;

  @Column({ name: "sequence_no", type: "int" })
  sequenceNo!: number;

  @Column({ type: "varchar", length: 16 })
  role!: TranscriptRole;

  @Column({ name: "speaker_type", type: "varchar", length: 24 })
  speakerType!: "human" | "assistant" | "system";

  @Column({ type: "text" })
  content!: string;

  @Column({ name: "content_type", type: "varchar", length: 16 })
  contentType!: ContentType;

  @Column({ name: "provider_event_id", type: "varchar", length: 128, nullable: true })
  providerEventId!: string | null;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

@Entity("report")
@Index("idx_report_conversation_unique", ["conversationId"], { unique: true })
export class ReportEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "conversation_id", type: "varchar", length: 64 })
  conversationId!: string;

  @OneToOne(() => ConversationEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation!: Relation<ConversationEntity>;

  @Column({ type: "varchar", length: 16 })
  status!: ReportStatus;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  summary!: string;

  @Column({ name: "grammar_score", type: "int", default: 0 })
  grammarScore!: number;

  @Column({ name: "vocabulary_score", type: "int", default: 0 })
  vocabularyScore!: number;

  @Column({ name: "fluency_score", type: "int", default: 0 })
  fluencyScore!: number;

  @Column({ name: "pronunciation_score", type: "int", default: 0 })
  pronunciationScore!: number;

  @Column({ name: "tone_score", type: "int", default: 0 })
  toneScore!: number;

  @Column({ name: "naturalness_score", type: "int", default: 0 })
  naturalnessScore!: number;

  @Column({ name: "strengths_json", type: "jsonb", default: () => "'[]'" })
  strengthsJson!: string[];

  @Column({ name: "issues_json", type: "jsonb", default: () => "'[]'" })
  issuesJson!: ReportIssue[];

  @Column({ name: "suggestions_json", type: "jsonb", default: () => "'[]'" })
  suggestionsJson!: string[];

  @Column({ name: "pdf_url", type: "text", nullable: true })
  pdfUrl!: string | null;

  @Column({ name: "generated_at", type: "timestamptz" })
  generatedAt!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

export const databaseEntities = [
  UserEntity,
  UserIdentityEntity,
  UserPreferenceEntity,
  AdminUserEntity,
  AuthSessionEntity,
  PracticeScenarioEntity,
  ScenarioRoleEntity,
  AnonymousSessionEntity,
  ConversationEntity,
  MessageEntity,
  ReportEntity,
] as const;
