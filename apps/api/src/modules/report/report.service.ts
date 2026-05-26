/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  MessageItem,
  PracticeScenario,
  ReportSummary,
  ScenarioRole,
} from "@learn-chinese-ai/shared-types";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PracticeStoreService } from "../../common/runtime/practice-store.service";

@Injectable()
export class ReportService {
  constructor(private readonly practiceStoreService: PracticeStoreService) {}

  getByConversationId(id: string): ReportSummary {
    const report = this.practiceStoreService.getReport(id);

    if (report) {
      return report;
    }

    const conversation = this.practiceStoreService.getConversationDetail(id);

    return this.generateReport({
      conversationId: id,
      scenario: {
        id: conversation.scenarioId,
        type: conversation.scenarioType,
        title: conversation.title,
        goal: conversation.goal,
      } as Pick<PracticeScenario, "id" | "type" | "title" | "goal">,
      selectedRole: { name: conversation.roleName } as Pick<ScenarioRole, "name">,
      transcript: conversation.transcript,
    });
  }

  generateAndStoreReport(input: {
    conversationId: string;
    scenario: PracticeScenario;
    selectedRole: ScenarioRole;
    transcript: MessageItem[];
  }) {
    const report = this.generateReport(input);
    this.practiceStoreService.saveReport(report);
    return report;
  }

  private generateReport(input: {
    conversationId: string;
    scenario: Pick<PracticeScenario, "id" | "type" | "title" | "goal">;
    selectedRole: Pick<ScenarioRole, "name">;
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

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }
}
