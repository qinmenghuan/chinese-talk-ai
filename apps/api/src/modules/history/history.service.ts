/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  ConversationDetail,
  ConversationSummary,
  MessageItem,
} from "@learn-chinese-ai/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { Repository } from "typeorm";
import {
  AnonymousSessionEntity,
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(AnonymousSessionEntity)
    private readonly anonymousSessionRepository: Repository<AnonymousSessionEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>
  ) {}

  async list(visitorToken: string): Promise<ConversationSummary[]> {
    const visitorTokenHash = createHash("sha256").update(visitorToken).digest("hex");
    const anonymousSession = await this.anonymousSessionRepository.findOne({
      where: { visitorTokenHash },
    });

    if (!anonymousSession) {
      return [];
    }

    const conversations = await this.conversationRepository.find({
      where: { anonymousSessionId: anonymousSession.id },
      relations: {
        scenario: true,
        selectedRole: true,
      },
      order: { startedAt: "DESC" },
    });

    if (conversations.length === 0) {
      return [];
    }

    const reports = await this.reportRepository.find({
      where: conversations.map((conversation) => ({ conversationId: conversation.id })),
    });
    const reportMap = new Map(reports.map((report) => [report.conversationId, report]));

    return conversations.map((conversation) => {
      const report = reportMap.get(conversation.id);
      return {
        id: conversation.id,
        scenarioId: conversation.scenario.id,
        scenarioType: conversation.scenario.type,
        title: conversation.scenario.title,
        startedAt: conversation.startedAt.toISOString(),
        endedAt: (conversation.endedAt ?? conversation.startedAt).toISOString(),
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

  async getDetail(conversationId: string): Promise<ConversationDetail> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: {
        scenario: true,
        selectedRole: true,
        anonymousSession: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} was not found.`);
    }

    const report = await this.reportRepository.findOne({
      where: { conversationId },
    });
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { sequenceNo: "ASC" },
    });
    const transcript: MessageItem[] = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      contentType: message.contentType,
      createdAt: message.createdAt.toISOString(),
    }));

    return {
      id: conversation.id,
      scenarioId: conversation.scenario.id,
      scenarioType: conversation.scenario.type,
      title: conversation.scenario.title,
      startedAt: conversation.startedAt.toISOString(),
      endedAt: (conversation.endedAt ?? conversation.startedAt).toISOString(),
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
      visitorToken: conversation.anonymousSession.visitorTokenHash,
      goal: conversation.scenario.goal,
      transcript,
    };
  }
}
