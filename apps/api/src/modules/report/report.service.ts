/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  MessageItem,
  PracticeDifficulty,
  ReportDetail,
  ReportIssue,
  ReportSummary,
} from "@learn-chinese-ai/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import {
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";
import { buildConversationSummary } from "../history/history-summary";

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

  async getByConversationIdForUser(userId: string, id: string): Promise<ReportSummary> {
    await this.getOwnedConversationOrThrow(userId, id);
    const report = await this.getReportEntityOrThrow(id);

    return this.toSummary(report);
  }

  async getDetailByConversationIdForUser(
    userId: string,
    id: string
  ): Promise<ReportDetail> {
    const conversation = await this.getOwnedConversationOrThrow(userId, id);

    const messages = await this.messageRepository.find({
      where: { conversationId: id },
      order: { sequenceNo: "ASC" },
    });
    const transcript = messages.map((message) => this.toMessageItem(message));
    const report = await this.getReportEntity(id);
    const summary = buildConversationSummary({
      id: conversation.id,
      scenario: conversation.scenario,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt ?? conversation.startedAt,
      status: conversation.status,
      selectedRole: conversation.selectedRole,
      selectedDifficulty: conversation.selectedDifficulty,
      report,
    });

    return {
      conversation: {
        ...summary,
        goal: conversation.scenario.goal,
        durationSeconds: conversation.durationSeconds,
      },
      transcript,
      report: report ? this.toSummary(report) : null,
    };
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
    const transcript = messages.map((message) => this.toMessageItem(message));
    const generated = this.generateReport({
      conversationId,
      scenario: {
        id: conversation.scenario.id,
        type: conversation.scenario.type,
        title: conversation.scenario.title,
        goal: conversation.scenario.goal,
        difficulty: conversation.selectedDifficulty ?? conversation.scenario.difficulty,
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
      difficulty: PracticeDifficulty;
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

    const issues = this.buildIssues(input.transcript, input.scenario.difficulty);

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
      issues: this.normalizeIssues(report.issuesJson),
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

  private async getReportEntityOrThrow(conversationId: string) {
    const report = await this.getReportEntity(conversationId);

    if (!report) {
      throw new NotFoundException(
        `Report for conversation ${conversationId} was not found.`
      );
    }

    return report;
  }

  private async getOwnedConversationOrThrow(userId: string, conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: {
        id: conversationId,
        userId,
      },
      relations: {
        scenario: true,
        selectedRole: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} was not found.`);
    }

    return conversation;
  }

  private async getReportEntity(conversationId: string) {
    const report = await this.reportRepository.findOne({
      where: { conversationId },
    });

    if (!report) {
      return null;
    }

    if (this.shouldRefreshReportEntity(report)) {
      return this.rebuildReportEntity(conversationId, {
        existingReportId: report.id,
        generatedAt: report.generatedAt,
      });
    }

    return report;
  }

  private toMessageItem(message: MessageEntity): MessageItem {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      contentType: message.contentType,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private buildIssues(
    transcript: MessageItem[],
    difficulty: PracticeDifficulty
  ): ReportIssue[] {
    const userMessages = transcript.filter(
      (message) =>
        message.role === "user" &&
        message.contentType === "final" &&
        message.content.trim().length > 0
    );

    const issues: ReportIssue[] = [];

    for (const message of userMessages) {
      const normalized = message.content.replace(/\s+/g, " ").trim();
      const englishWordMatch = normalized.match(/[A-Za-z][A-Za-z'-]*/);
      const containsChinese = /[\u4e00-\u9fff]/.test(normalized);
      const englishWordCount = normalized.match(/[A-Za-z][A-Za-z'-]*/g)?.length ?? 0;
      const repeatedParticleMatch = normalized.match(/(.)(\1){2,}/);

      if (
        englishWordMatch &&
        containsChinese &&
        (difficulty !== "beginner" || englishWordCount >= 2)
      ) {
        const englishWord = englishWordMatch[0];
        issues.push({
          original: normalized,
          problem: `The English word "${englishWord}" interrupts the Chinese sentence.`,
          better: `Try replacing "${englishWord}" with a Chinese word that fits this scenario and say the full idea in one Chinese sentence.`,
          note: "Reducing code-switching will make the sentence sound more stable and natural.",
        });
      } else if (difficulty !== "beginner" && !containsChinese) {
        issues.push({
          original: normalized,
          problem:
            "This turn relies almost entirely on non-Chinese wording, so the target-language output is too limited.",
          better:
            "Restate the same meaning with a full Chinese sentence before moving on.",
          note: "At intermediate and advanced levels, the report only flags issues when the word choice clearly breaks the Chinese response.",
        });
      } else if (difficulty === "advanced" && repeatedParticleMatch) {
        issues.push({
          original: normalized,
          problem: `The repeated form "${repeatedParticleMatch[0]}" makes the wording sound unstable.`,
          better:
            "Replace the repeated part with one clear word or rewrite the clause once in a complete way.",
          note: "This is treated as an issue only at higher difficulty, where wording accuracy matters more.",
        });
      }

      if (issues.length >= 3) {
        break;
      }
    }

    return issues.slice(0, 3);
  }

  private normalizeIssues(input: unknown): ReportIssue[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "original" in item &&
          "problem" in item &&
          "better" in item &&
          "note" in item
        ) {
          const issue = item as ReportIssue;

          return {
            original: issue.original,
            problem: issue.problem,
            better: issue.better,
            note: issue.note,
          };
        }

        if (typeof item === "string") {
          return {
            original: "Legacy feedback item",
            problem: item,
            better:
              "Review the related sentence in the transcript and restate it with fuller Chinese phrasing.",
            note: "This older report item was normalized into the new issue format.",
          };
        }

        return null;
      })
      .filter((item): item is ReportIssue => item !== null);
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
        ...report.suggestionsJson,
        ...this.normalizeIssues(report.issuesJson).flatMap((issue) => [
          issue.original,
          issue.problem,
          issue.better,
          issue.note,
        ]),
      ].join(" ")
    );
  }

  private shouldRefreshReportEntity(report: ReportEntity) {
    return (
      this.containsChineseDisplayCopy(report) ||
      !Array.isArray(report.issuesJson) ||
      report.issuesJson.some(
        (item) =>
          !item ||
          typeof item !== "object" ||
          !("original" in item) ||
          !("problem" in item) ||
          !("better" in item) ||
          !("note" in item)
      )
    );
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }
}
