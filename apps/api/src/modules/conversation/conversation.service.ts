/* eslint-disable @typescript-eslint/consistent-type-imports */
import type { ConversationReply } from "@learn-chinese-ai/shared-types";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PracticeStoreService } from "../../common/runtime/practice-store.service";
import { ReportService } from "../report/report.service";
import { ScenarioService } from "../scenario/scenario.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateConversationReplyDto } from "./dto/create-conversation-reply.dto";
import { EndConversationDto } from "./dto/end-conversation.dto";

@Injectable()
export class ConversationService {
  constructor(
    private readonly practiceStoreService: PracticeStoreService,
    private readonly scenarioService: ScenarioService,
    private readonly reportService: ReportService
  ) {}

  create(dto: CreateConversationDto) {
    const scenario = this.scenarioService.getScenarioById(dto.scenarioId, dto.mode);
    const selectedRole = this.scenarioService.getScenarioRole(scenario, dto.roleId);
    const conversation = this.practiceStoreService.createConversation({
      visitorToken: dto.visitorToken,
      scenario,
      selectedRole,
    });

    return {
      id: conversation.id,
      anonymousSessionId: conversation.anonymousSessionId,
      scenarioId: scenario.id,
      status: conversation.status,
    };
  }

  reply(id: string, dto: CreateConversationReplyDto): ConversationReply {
    const conversation = this.practiceStoreService.getConversation(id);
    const now = new Date().toISOString();
    const normalizedContent = dto.content.trim();
    const userTurnCount = conversation.transcript.filter(
      (message) => message.role === "user"
    ).length;

    const userMessage = {
      id: `msg_${randomUUID()}`,
      role: "user" as const,
      content: normalizedContent,
      contentType: "final" as const,
      createdAt: now,
    };
    const assistantMessage = {
      id: `msg_${randomUUID()}`,
      role: "assistant" as const,
      content: this.buildAssistantReply(
        conversation.scenario.id,
        normalizedContent,
        userTurnCount
      ),
      contentType: "final" as const,
      createdAt: new Date(Date.now() + 50).toISOString(),
    };

    this.practiceStoreService.appendMessages(id, [userMessage, assistantMessage]);

    return {
      userMessage,
      assistantMessage,
      conversationStatus: "active",
    };
  }

  close(id: string, dto: EndConversationDto) {
    if (dto.transcript.length > 0) {
      this.practiceStoreService.replaceTranscript(id, dto.transcript);
    }

    const conversation = this.practiceStoreService.closeConversation(id);
    this.practiceStoreService.updateConversationStatus(id, "report_pending");
    this.reportService.generateAndStoreReport({
      conversationId: id,
      scenario: conversation.scenario,
      selectedRole: conversation.selectedRole,
      transcript: conversation.transcript,
    });

    return {
      id,
      status: "report_ready",
      savedMessages: dto.transcript.length,
      reportStatus: "ready",
    };
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

    const template = replyLibrary[scenarioId] ?? replyLibrary["free-chat"];
    const safeTemplate = template ?? ["我们继续聊吧。你可以再用中文多说一点当前的话题。"];
    const fallbackReply =
      safeTemplate[safeTemplate.length - 1] ??
      "我们继续聊吧。你可以再用中文多说一点当前的话题。";
    const nextReply =
      safeTemplate[Math.min(turnCount, safeTemplate.length - 1)] ?? fallbackReply;

    if (normalized.includes("谢谢")) {
      return `${nextReply} 另外，你刚才用了“谢谢”，语气很自然，继续保持。`;
    }

    return nextReply;
  }
}
