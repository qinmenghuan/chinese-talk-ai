/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  ConversationDetail,
  HistoryListResponse,
  MessageItem,
} from "@learn-chinese-ai/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { IsNull, Not, Repository } from "typeorm";
import {
  AnonymousSessionEntity,
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";
import {
  buildConversationSummary,
  buildHistoryListResponse,
  DEFAULT_HISTORY_PAGE_SIZE,
} from "./history-summary";

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

  async list(input: {
    visitorToken: string;
    page?: number;
    pageSize?: number;
  }): Promise<HistoryListResponse> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize =
      input.pageSize && input.pageSize > 0 ? input.pageSize : DEFAULT_HISTORY_PAGE_SIZE;
    const visitorTokenHash = createHash("sha256")
      .update(input.visitorToken)
      .digest("hex");
    const anonymousSession = await this.anonymousSessionRepository.findOne({
      where: { visitorTokenHash },
    });

    if (!anonymousSession) {
      return buildHistoryListResponse({
        items: [],
        page,
        pageSize,
        total: 0,
      });
    }

    const [conversations, total] = await this.conversationRepository.findAndCount({
      // 中文注释：
      // history 只展示“已经结束并持久化”的会话。
      // 进入 practice 时虽然会先创建 conversation 行，但如果用户没有真正发生对话，
      // 这个会话不会 close，也不会进入 history。
      where: {
        anonymousSessionId: anonymousSession.id,
        endedAt: Not(IsNull()),
      },
      relations: {
        scenario: true,
        selectedRole: true,
      },
      order: { startedAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    if (conversations.length === 0) {
      return buildHistoryListResponse({
        items: [],
        page,
        pageSize,
        total,
      });
    }

    const reports = await this.reportRepository.find({
      where: conversations.map((conversation) => ({ conversationId: conversation.id })),
    });
    const reportMap = new Map(reports.map((report) => [report.conversationId, report]));

    const items = conversations.map((conversation) =>
      buildConversationSummary({
        id: conversation.id,
        scenario: conversation.scenario,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt ?? conversation.startedAt,
        status: conversation.status,
        selectedRole: conversation.selectedRole,
        selectedDifficulty: conversation.selectedDifficulty,
        report: reportMap.get(conversation.id),
      })
    );

    return buildHistoryListResponse({
      items,
      page,
      pageSize,
      total,
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
      ...buildConversationSummary({
        id: conversation.id,
        scenario: conversation.scenario,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt ?? conversation.startedAt,
        status: conversation.status,
        selectedRole: conversation.selectedRole,
        selectedDifficulty: conversation.selectedDifficulty,
        report,
      }),
      visitorToken: conversation.anonymousSession.visitorTokenHash,
      goal: conversation.scenario.goal,
      transcript,
    };
  }
}
