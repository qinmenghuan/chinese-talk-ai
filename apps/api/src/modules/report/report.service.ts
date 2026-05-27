/* eslint-disable @typescript-eslint/consistent-type-imports */
import type { MessageItem, ReportSummary } from "@learn-chinese-ai/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import {
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>
  ) {}

  async getByConversationId(id: string): Promise<ReportSummary> {
    const report = await this.reportRepository.findOne({
      where: { conversationId: id },
    });

    if (!report) {
      throw new NotFoundException(`Report for conversation ${id} was not found.`);
    }

    return this.toSummary(report);
  }

  async generateAndStoreReport(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: {
        scenario: true,
        selectedRole: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} was not found.`);
    }

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
    const generated = this.generateReport({
      conversationId,
      scenario: {
        id: conversation.scenario.id,
        type: conversation.scenario.type,
        title: conversation.scenario.title,
        goal: conversation.scenario.goal,
      },
      selectedRole: {
        name: conversation.selectedRole.name,
      },
      transcript,
    });

    await this.reportRepository.upsert(
      {
        id: generated.id,
        conversationId,
        status: generated.status,
        title: generated.title,
        summary: generated.summary,
        grammarScore: generated.grammarScore,
        vocabularyScore: generated.vocabularyScore,
        fluencyScore: generated.fluencyScore,
        pronunciationScore: generated.pronunciationScore,
        toneScore: generated.toneScore,
        naturalnessScore: generated.naturalnessScore,
        strengthsJson: generated.strengths,
        issuesJson: generated.issues,
        suggestionsJson: generated.suggestions,
        pdfUrl: generated.pdfFileName,
        generatedAt: new Date(generated.generatedAt),
      },
      ["conversationId"]
    );

    conversation.status = "report_ready";
    await this.conversationRepository.save(conversation);

    return generated;
  }

  private generateReport(input: {
    conversationId: string;
    scenario: {
      id: string;
      type: string;
      title: string;
      goal: string;
    };
    selectedRole: {
      name: string;
    };
    transcript: MessageItem[];
  }): ReportSummary {
    const userMessages = input.transcript.filter(
      (message) => message.role === "user" && message.contentType === "final"
    );
    const joinedUserText = userMessages.map((message) => message.content).join(" ");
    const totalLength = joinedUserText.length || 1;
    const chineseChars = (joinedUserText.match(/[\u4e00-\u9fff]/g) ?? []).length;
    const englishChars = (joinedUserText.match(/[A-Za-z]/g) ?? []).length;
    const politeHits = (joinedUserText.match(/请|谢谢|麻烦|您好|你好|劳驾/g) ?? [])
      .length;
    const questionHits = (joinedUserText.match(/[吗呢吧？?]/g) ?? []).length;
    const averageLength = totalLength / Math.max(userMessages.length, 1);
    const chineseRatio = chineseChars / totalLength;
    const englishRatio = englishChars / totalLength;

    const grammarScore = this.clamp(
      Math.round(62 + averageLength * 1.6 + chineseRatio * 20),
      60,
      96
    );
    const vocabularyScore = this.clamp(
      Math.round(64 + userMessages.length * 4 + chineseRatio * 16),
      60,
      95
    );
    const fluencyScore = this.clamp(
      Math.round(60 + userMessages.length * 5 + averageLength * 0.8),
      58,
      94
    );
    const pronunciationScore = this.clamp(
      Math.round(68 + chineseRatio * 16 - englishRatio * 8),
      60,
      92
    );
    const toneScore = this.clamp(
      Math.round(65 + chineseRatio * 18 - englishRatio * 6),
      58,
      91
    );
    const naturalnessScore = this.clamp(
      Math.round(62 + politeHits * 3 + questionHits * 2 + chineseRatio * 12),
      60,
      94
    );

    const strengths = [
      `能够围绕“${input.scenario.title}”持续开口，表达目标比较明确。`,
      `在“${input.selectedRole.name}”这个角色中，整体语气比较自然。`,
      englishRatio < 0.2
        ? "中文使用比例较高，说明你愿意主动用中文完成场景任务。"
        : "在需要时能够借助中英混合表达保持对话继续进行。",
    ];

    const issues = [
      averageLength < 12
        ? "句子偏短，信息量还可以再完整一些。"
        : "长句开始增多，但个别句子的过渡还不够顺。",
      englishRatio > 0.18
        ? "英文借词略多，说明部分中文词汇还不够稳定。"
        : "词汇总体够用，但还可以增加更地道的场景表达。",
      "声调和发音问题仍需通过重复跟读和对比练习继续强化。",
    ];

    const suggestions = [
      `围绕“${input.scenario.goal}”再做一轮复练，尽量把每句话扩展到 10 到 15 个字。`,
      "把本次对话中最重要的 3 句话抄下来，重点练习声调和停顿。",
      "下一次练习时优先减少英文借词，尽量使用更完整的中文表达。",
    ];

    return {
      id: `rep_${randomUUID()}`,
      conversationId: input.conversationId,
      status: "ready",
      title: `${input.scenario.title}练习报告`,
      summary: `本次练习围绕“${input.scenario.title}”展开，你已经能够完成基本交流，并且能在“${input.selectedRole.name}”的角色中持续作答。下一步建议重点提升语法完整度、场景词汇稳定度，以及声调和自然过渡。`,
      strengths,
      issues,
      suggestions,
      grammarScore,
      vocabularyScore,
      fluencyScore,
      pronunciationScore,
      toneScore,
      naturalnessScore,
      pdfFileName: `${input.conversationId}-report.pdf`,
      generatedAt: new Date().toISOString(),
    };
  }

  private toSummary(report: ReportEntity): ReportSummary {
    return {
      id: report.id,
      conversationId: report.conversationId,
      status: report.status,
      title: report.title,
      summary: report.summary,
      strengths: report.strengthsJson,
      issues: report.issuesJson,
      suggestions: report.suggestionsJson,
      grammarScore: report.grammarScore,
      vocabularyScore: report.vocabularyScore,
      fluencyScore: report.fluencyScore,
      pronunciationScore: report.pronunciationScore,
      toneScore: report.toneScore,
      naturalnessScore: report.naturalnessScore,
      pdfFileName: report.pdfUrl ?? `${report.conversationId}-report.pdf`,
      generatedAt: report.generatedAt.toISOString(),
    };
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }
}
