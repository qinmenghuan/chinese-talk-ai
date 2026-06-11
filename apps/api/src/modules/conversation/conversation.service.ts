/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  AdminConversationListQuery,
  AdminConversationListResponse,
  ConversationReply,
  DeleteAdminConversationResponse,
  MessageItem,
} from "@learn-chinese-ai/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Brackets, IsNull, Repository } from "typeorm";
import {
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";
import { RedisService } from "../../common/redis/redis.service";
import { ReportService } from "../report/report.service";
import { ScenarioService } from "../scenario/scenario.service";
import { buildAdminConversationListItem } from "./admin-conversation-summary";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateConversationReplyDto } from "./dto/create-conversation-reply.dto";
import { EndConversationDto } from "./dto/end-conversation.dto";

const DEFAULT_ADMIN_CONVERSATION_PAGE_SIZE = 20;

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>,
    private readonly redisService: RedisService,
    private readonly scenarioService: ScenarioService,
    private readonly reportService: ReportService
  ) {}

  async create(userId: string, dto: CreateConversationDto) {
    const scenario = this.scenarioService.getScenarioById(dto.scenarioId, dto.mode);
    const selectedRole = this.scenarioService.getScenarioRole(scenario, dto.roleId);
    const id = `conv_${randomUUID()}`;

    await this.conversationRepository.save({
      id,
      userId,
      anonymousSessionId: null,
      scenarioId: scenario.id,
      selectedRoleId: selectedRole.id,
      mode: scenario.mode,
      provider: "manual",
      providerRoomId: null,
      providerSessionId: null,
      status: "active",
      startedAt: new Date(),
      endedAt: null,
      durationSeconds: 0,
      deletedAt: null,
      deletedByAdminId: null,
    });

    return {
      id,
      scenarioId: scenario.id,
      status: "active" as const,
    };
  }

  // 中文注释：回复会话
  async reply(
    userId: string,
    id: string,
    dto: CreateConversationReplyDto
  ): Promise<ConversationReply> {
    const conversation = await this.getOwnedConversationOrThrow(userId, id);
    const transcript = await this.getTranscriptBuffer(id);
    const now = new Date();
    const normalizedContent = dto.content.trim();
    const userTurnCount = transcript.filter((message) => message.role === "user").length;
    const userMessage: MessageItem = {
      id: `msg_${randomUUID()}`,
      role: "user",
      content: normalizedContent,
      contentType: "final",
      createdAt: now.toISOString(),
    };
    const assistantMessage: MessageItem = {
      id: `msg_${randomUUID()}`,
      role: "assistant",
      content: this.buildAssistantReply(
        conversation.scenarioId,
        normalizedContent,
        userTurnCount
      ),
      contentType: "final",
      createdAt: new Date(now.getTime() + 50).toISOString(),
    };

    await this.redisService.setJson(
      this.getTranscriptKey(id),
      [...transcript, userMessage, assistantMessage],
      600
    );

    return {
      userMessage,
      assistantMessage,
      conversationStatus: "active",
    };
  }

  async close(userId: string, id: string, dto: EndConversationDto) {
    const conversation = await this.getOwnedConversationOrThrow(userId, id);
    const transcript =
      dto.transcript && dto.transcript.length > 0
        ? dto.transcript
        : await this.getTranscriptBuffer(id);
    const hasCompletedUserConversation = transcript.some(
      (message) =>
        message.role === "user" &&
        message.contentType === "final" &&
        message.content.trim().length > 0
    );

    // 中文注释：
    // 只有至少一条用户最终发言，才允许把会话持久化成历史记录。
    // 这样可以避免用户只是进入 practice 页面、还没真正开口，就生成一条空 history。
    if (!hasCompletedUserConversation) {
      return {
        id,
        status: conversation.status,
        savedMessages: 0,
        reportStatus: "pending" as const,
      };
    }

    const lockAcquired = await this.redisService.setIfAbsent(
      this.getCloseLockKey(id),
      "1",
      600
    );

    if (!lockAcquired) {
      return {
        id,
        status: conversation.status,
        savedMessages: 0,
        reportStatus: "pending" as const,
      };
    }
    const shouldGenerateReport = dto.generateReport ?? true;

    conversation.status = shouldGenerateReport ? "report_pending" : "ended";
    conversation.endedAt = new Date();
    conversation.durationSeconds = Math.max(
      0,
      Math.round(
        (conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 1000
      )
    );
    await this.conversationRepository.save(conversation);

    await this.messageRepository.delete({ conversationId: id });
    await this.messageRepository.save(
      transcript.map((message, index) => ({
        id: message.id,
        conversationId: id,
        sequenceNo: index + 1,
        role: message.role,
        speakerType:
          message.role === "user"
            ? "human"
            : message.role === "assistant"
              ? "assistant"
              : "system",
        content: message.content,
        contentType: message.contentType,
        providerEventId: null,
        createdAt: new Date(message.createdAt),
      }))
    );

    if (shouldGenerateReport) {
      await this.reportService.generateAndStoreReport(id);
    }

    await this.redisService.delete(this.getTranscriptKey(id));

    return {
      id,
      status: shouldGenerateReport ? ("report_ready" as const) : ("ended" as const),
      savedMessages: transcript.length,
      reportStatus: shouldGenerateReport ? ("ready" as const) : ("pending" as const),
    };
  }

  async listAdminConversations(
    input: AdminConversationListQuery
  ): Promise<AdminConversationListResponse> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize =
      input.pageSize && input.pageSize > 0
        ? Math.min(input.pageSize, DEFAULT_ADMIN_CONVERSATION_PAGE_SIZE)
        : DEFAULT_ADMIN_CONVERSATION_PAGE_SIZE;
    const normalizedUserKeyword = input.userKeyword?.trim().toLowerCase();
    const normalizedTitle = input.title?.trim().toLowerCase();
    const startedFrom = this.parseDateBoundary(input.startedFrom, "start");
    const startedTo = this.parseDateBoundary(input.startedTo, "end");
    const query = this.conversationRepository
      .createQueryBuilder("conversation")
      .leftJoinAndSelect("conversation.scenario", "scenario")
      .leftJoinAndSelect("conversation.selectedRole", "selectedRole")
      .leftJoinAndSelect("conversation.user", "user")
      .leftJoinAndSelect("conversation.anonymousSession", "anonymousSession")
      .where("conversation.deletedAt IS NULL");

    if (startedFrom) {
      query.andWhere("conversation.startedAt >= :startedFrom", {
        startedFrom: startedFrom.toISOString(),
      });
    }

    if (startedTo) {
      query.andWhere("conversation.startedAt <= :startedTo", {
        startedTo: startedTo.toISOString(),
      });
    }

    if (normalizedTitle) {
      query.andWhere("LOWER(scenario.title) LIKE :title", {
        title: `%${normalizedTitle}%`,
      });
    }

    if (input.type) {
      query.andWhere("scenario.type = :type", { type: input.type });
    }

    if (normalizedUserKeyword) {
      query.andWhere(
        new Brackets((scope) => {
          scope
            .where("LOWER(user.displayName) LIKE :userKeyword", {
              userKeyword: `%${normalizedUserKeyword}%`,
            })
            .orWhere("LOWER(user.email) LIKE :userKeyword", {
              userKeyword: `%${normalizedUserKeyword}%`,
            })
            .orWhere("LOWER(user.id) LIKE :userKeyword", {
              userKeyword: `%${normalizedUserKeyword}%`,
            })
            .orWhere("LOWER(anonymousSession.visitorTokenHash) LIKE :userKeyword", {
              userKeyword: `%${normalizedUserKeyword}%`,
            });
        })
      );
    }

    const [conversations, total] = await query
      .orderBy("conversation.startedAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const reports =
      conversations.length === 0
        ? []
        : await this.reportRepository.find({
            where: conversations.map((conversation) => ({
              conversationId: conversation.id,
            })),
          });
    const reportMap = new Map(reports.map((report) => [report.conversationId, report]));

    return {
      items: conversations.map((conversation) =>
        buildAdminConversationListItem({
          id: conversation.id,
          scenario: conversation.scenario,
          selectedRole: conversation.selectedRole,
          selectedDifficulty: conversation.selectedDifficulty,
          user: conversation.user,
          anonymousSession: conversation.anonymousSession,
          startedAt: conversation.startedAt,
          endedAt: conversation.endedAt,
          status: conversation.status,
          report: reportMap.get(conversation.id),
        })
      ),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  async deleteConversationByAdmin(
    conversationId: string,
    adminId: string
  ): Promise<DeleteAdminConversationResponse> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} was not found.`);
    }

    if (conversation.deletedAt) {
      return { success: true };
    }

    conversation.deletedAt = new Date();
    conversation.deletedByAdminId = adminId;
    await this.conversationRepository.save(conversation);

    return { success: true };
  }

  private async getConversationOrThrow(id: string) {
    const conversation = await this.conversationRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
      relations: {
        scenario: true,
        selectedRole: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} was not found.`);
    }

    return conversation;
  }

  private async getOwnedConversationOrThrow(userId: string, id: string) {
    const conversation = await this.getConversationOrThrow(id);

    if (conversation.userId !== userId) {
      throw new NotFoundException(`Conversation ${id} was not found.`);
    }

    return conversation;
  }

  private async getTranscriptBuffer(conversationId: string) {
    return this.redisService.getJson<MessageItem[]>(
      this.getTranscriptKey(conversationId),
      []
    );
  }

  private getTranscriptKey(conversationId: string) {
    return `lcai:rt:subtitle:${conversationId}`;
  }

  private getCloseLockKey(conversationId: string) {
    return `lcai:idempotency:close:${conversationId}`;
  }

  private parseDateBoundary(
    value: string | undefined,
    boundary: "start" | "end"
  ): Date | null {
    if (!value?.trim()) {
      return null;
    }

    const normalized = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const suffix = boundary === "start" ? "T00:00:00.000" : "T23:59:59.999";
      const parsed = new Date(`${normalized}${suffix}`);

      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private buildAssistantReply(
    scenarioId: string,
    latestUserMessage: string,
    turnCount: number
  ): string {
    const normalized = latestUserMessage.replace(/\s+/g, " ").trim();
    const replyLibrary: Record<string, string[]> = {
      "daily-cafe": [
        "好的，请问你想要热的还是冰的？如果需要，我也可以帮你推荐。",
        "明白了。你想要中杯还是大杯？甜度和牛奶类型也可以一起告诉我。",
        "好的，我帮你确认一下订单。最后你可以再用中文重复一遍你的选择。",
      ],
      "interview-intro": [
        "谢谢你的介绍。接下来请你说一说，你为什么想学习中文？",
        "很好。那你最近在学习中文时，觉得最有挑战的部分是什么？",
        "不错。请再用更完整的句子总结一下你的学习目标和下一步计划。",
      ],
      "travel-hotel": [
        "好的，请告诉我您的姓名和入住日期，我来帮您核对预订信息。",
        "没问题。请问您希望大床房还是双床房？另外，您需要早餐吗？",
        "好的，入住流程差不多完成了。请您再确认一下是否还有其他需求。",
      ],
      "business-meeting": [
        "谢谢你的开场。请你进一步说明一下今天最优先讨论的两个重点。",
        "明白了。那你能不能用更正式一点的表达，再总结一次你的建议？",
        "很好。最后请你做一个简短收尾，并确认下一步行动。",
      ],
      "free-chat": [
        "听起来不错。你可以继续用中文多说一点，我会根据你的表达继续和你聊天。",
        "很好，你已经在持续开口了。接下来请你用更完整的句子再说明一次。",
        "不错。我们继续聊，你最近最想提升的中文能力是什么？",
      ],
    };
    const template = replyLibrary[scenarioId] ??
      replyLibrary["free-chat"] ?? ["我们继续聊吧。你可以再用中文多说一点当前的话题。"];
    const fallbackReply =
      template[template.length - 1] ?? "我们继续聊吧。你可以再用中文多说一点当前的话题。";
    const nextReply = template[Math.min(turnCount, template.length - 1)] ?? fallbackReply;

    if (normalized.includes("谢谢")) {
      return `${nextReply} 另外，你刚才用了“谢谢”，语气很自然，继续保持。`;
    }

    return nextReply;
  }
}
