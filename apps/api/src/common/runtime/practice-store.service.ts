import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ConversationDetail,
  ConversationStatus,
  MessageItem,
  PracticeScenario,
  ReportSummary,
  ScenarioRole,
} from "@learn-chinese-ai/shared-types";
import { randomUUID } from "node:crypto";
import { resolveScenarioOpeningLine } from "../scenario/resolve-scenario-opening-line";

interface StoredConversation {
  id: string;
  anonymousSessionId: string;
  visitorToken: string;
  scenario: PracticeScenario;
  selectedRole: ScenarioRole;
  transcript: MessageItem[];
  status: ConversationStatus;
  startedAt: string;
  endedAt: string | null;
}

@Injectable()
export class PracticeStoreService {
  private readonly anonymousSessions = new Map<string, string>();
  private readonly conversations = new Map<string, StoredConversation>();
  private readonly reports = new Map<string, ReportSummary>();

  reset() {
    this.anonymousSessions.clear();
    this.conversations.clear();
    this.reports.clear();
  }

  ensureAnonymousSession(visitorToken: string): string {
    const existing = this.anonymousSessions.get(visitorToken);

    if (existing) {
      return existing;
    }

    const anonymousSessionId = `anon_${randomUUID()}`;
    this.anonymousSessions.set(visitorToken, anonymousSessionId);

    return anonymousSessionId;
  }

  createConversation(input: {
    visitorToken: string;
    scenario: PracticeScenario;
    selectedRole: ScenarioRole;
  }): StoredConversation {
    const id = `conv_${randomUUID()}`;
    const startedAt = new Date().toISOString();
    const openingMessage: MessageItem = {
      id: `msg_${randomUUID()}`,
      role: "assistant",
      content: resolveScenarioOpeningLine(input.scenario, input.selectedRole.id),
      contentType: "final",
      createdAt: startedAt,
    };

    const conversation: StoredConversation = {
      id,
      anonymousSessionId: this.ensureAnonymousSession(input.visitorToken),
      visitorToken: input.visitorToken,
      scenario: input.scenario,
      selectedRole: input.selectedRole,
      transcript: [openingMessage],
      status: "active",
      startedAt,
      endedAt: null,
    };

    this.conversations.set(id, conversation);

    return conversation;
  }

  getConversation(conversationId: string): StoredConversation {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} was not found.`);
    }

    return conversation;
  }

  appendMessages(conversationId: string, messages: MessageItem[]) {
    const conversation = this.getConversation(conversationId);
    conversation.transcript.push(...messages);
  }

  replaceTranscript(conversationId: string, transcript: MessageItem[]) {
    const conversation = this.getConversation(conversationId);
    conversation.transcript = transcript;
  }

  updateConversationStatus(conversationId: string, status: ConversationStatus) {
    const conversation = this.getConversation(conversationId);
    conversation.status = status;
  }

  closeConversation(conversationId: string) {
    const conversation = this.getConversation(conversationId);
    conversation.status = "ended";
    conversation.endedAt = new Date().toISOString();

    return conversation;
  }

  saveReport(report: ReportSummary) {
    this.reports.set(report.conversationId, report);
    const conversation = this.getConversation(report.conversationId);
    conversation.status = "report_ready";
  }

  getReport(conversationId: string): ReportSummary | null {
    return this.reports.get(conversationId) ?? null;
  }

  listHistory(visitorToken: string) {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.visitorToken === visitorToken)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .map((conversation) => {
        const report = this.reports.get(conversation.id);
        return {
          id: conversation.id,
          scenarioId: conversation.scenario.id,
          scenarioType: conversation.scenario.type,
          title: conversation.scenario.title,
          startedAt: conversation.startedAt,
          endedAt: conversation.endedAt ?? conversation.startedAt,
          status: conversation.status,
          score: report
            ? Math.round(
                (report.grammarScore +
                  report.vocabularyScore +
                  report.fluencyScore +
                  report.pronunciationScore +
                  report.toneScore +
                  report.naturalnessScore) /
                  6
              )
            : 0,
          roleName: conversation.selectedRole.name,
        };
      });
  }

  getConversationDetail(conversationId: string): ConversationDetail {
    const conversation = this.getConversation(conversationId);
    const report = this.reports.get(conversation.id);

    return {
      id: conversation.id,
      scenarioId: conversation.scenario.id,
      scenarioType: conversation.scenario.type,
      title: conversation.scenario.title,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt ?? conversation.startedAt,
      status: conversation.status,
      score: report
        ? Math.round(
            (report.grammarScore +
              report.vocabularyScore +
              report.fluencyScore +
              report.pronunciationScore +
              report.toneScore +
              report.naturalnessScore) /
              6
          )
        : 0,
      roleName: conversation.selectedRole.name,
      visitorToken: conversation.visitorToken,
      goal: conversation.scenario.goal,
      transcript: conversation.transcript,
    };
  }
}
