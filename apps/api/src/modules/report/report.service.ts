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

    if (this.containsChineseDisplayCopy(report)) {
      const refreshedReport = await this.rebuildReportEntity(id, {
        existingReportId: report.id,
        generatedAt: report.generatedAt,
      });

      return this.toSummary(refreshedReport);
    }

    return this.toSummary(report);
  }

  async generateAndStoreReport(conversationId: string) {
    const report = await this.rebuildReportEntity(conversationId);

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} was not found.`);
    }

    conversation.status = "report_ready";
    await this.conversationRepository.save(conversation);

    return this.toSummary(report);
  }

  private async rebuildReportEntity(
    conversationId: string,
    options?: {
      existingReportId?: string;
      generatedAt?: Date;
    }
  ) {
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
        id: options?.existingReportId ?? generated.id,
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
        generatedAt: options?.generatedAt ?? new Date(generated.generatedAt),
      },
      ["conversationId"]
    );

    const report = await this.reportRepository.findOne({
      where: { conversationId },
    });

    if (!report) {
      throw new NotFoundException(
        `Report for conversation ${conversationId} was not found.`
      );
    }

    return report;
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
      `You stayed on topic in the "${input.scenario.title}" scenario and kept your speaking goal clear.`,
      `Your tone felt fairly natural while playing the "${input.selectedRole.name}" role.`,
      englishRatio < 0.2
        ? "You relied mostly on Chinese, which shows a strong willingness to stay in the target language."
        : "You used a workable mix of Chinese and English to keep the conversation moving.",
    ];

    const issues = [
      averageLength < 12
        ? "Most sentences were still quite short, so your ideas could be developed more fully."
        : "You are starting to produce longer sentences, but some transitions still sound a bit abrupt.",
      englishRatio > 0.18
        ? "English words appeared fairly often, which suggests some Chinese vocabulary is still unstable."
        : "Your core vocabulary was sufficient, but you can add more idiomatic phrases for this scenario.",
      "Tone and pronunciation still need repeated shadowing and comparison practice.",
    ];

    const suggestions = [
      `Do another round focused on "${input.scenario.goal}" and try expanding each sentence to about 10 to 15 Chinese characters.`,
      "Write down the 3 most important sentences from this session and practice the tones and pauses carefully.",
      "In your next session, reduce English fillers and aim for more complete Chinese sentences.",
    ];

    return {
      id: `rep_${randomUUID()}`,
      conversationId: input.conversationId,
      status: "ready",
      title: `${input.scenario.title} Practice Report`,
      summary: `This session focused on "${input.scenario.title}". You were able to complete the basic exchange and keep responding in the "${input.selectedRole.name}" role. Next, focus on fuller grammar, more stable scenario vocabulary, and smoother tone and transitions.`,
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

  private containsChineseDisplayCopy(
    report: Pick<
      ReportEntity,
      "title" | "summary" | "strengthsJson" | "issuesJson" | "suggestionsJson"
    >
  ) {
    return /[\u4e00-\u9fff]/.test(
      [
        report.title,
        report.summary,
        ...report.strengthsJson,
        ...report.issuesJson,
        ...report.suggestionsJson,
      ].join(" ")
    );
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }
}
