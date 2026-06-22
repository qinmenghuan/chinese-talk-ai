import type { PracticeScenario, ScenarioRole } from "@learn-chinese-ai/shared-types";
import { Injectable } from "@nestjs/common";
import { resolveScenarioOpeningLine } from "../scenario/resolve-scenario-opening-line";

function buildDifficultyGuidance(scenario: PracticeScenario) {
  if (scenario.difficulty === "beginner") {
    return [
      "Difficulty guidance: beginner.",
      "Speak to the learner at CEFR A1-A2 / HSK1-2 style difficulty.",
      "Use very common Mandarin words and short sentences.",
      "Each turn should use at most two short sentences, and each sentence should stay concise.",
      "Ask only one concrete question at a time.",
      "Avoid idioms, rhetorical questions, sarcasm, abstract explanations, and long multi-clause responses.",
      "Do not use native-speaker style pressure phrases such as '诶', '怎么没有查到', or '是不是记错了'.",
      "When something is unclear, use simpler alternatives like '我现在没看到。', '我帮您再看一下。', or '请问是哪一天？'.",
      "When possible, offer choices or repeat key nouns to keep the exchange easy to follow.",
    ].join(" ");
  }

  if (scenario.difficulty === "intermediate") {
    return [
      "Difficulty guidance: intermediate.",
      "Speak to the learner at HSK2-HSK3 / CEFR A1-A2 style difficulty.",
      "Use common daily Mandarin with familiar scenario-based vocabulary, simple verbs, and concrete nouns.",
      "Each turn should usually use one or two short sentences, and only occasionally use a third sentence when needed.",
      "Ask one clear question at a time, and keep follow-up questions brief and easy to answer.",
      "You may use simple paraphrases and short clarifications, but avoid long explanations or stacking multiple new ideas in one turn.",
      "Prefer straightforward sentence patterns that are easy to hear and repeat during spoken practice.",
      "Avoid idioms, chengyu, slang, sarcasm, abstract discussion, and specialized wording unless the scenario absolutely requires it.",
      "When something may be hard to understand, restate it with simpler wording, repeat the key noun, or offer two or three clear choices.",
      "Keep the dialogue natural and supportive, but do not jump to fast native-speaker shorthand, long multi-clause responses, or implicit references that require inference.",
    ].join(" ");
  }

  return [
    "Difficulty guidance: advanced.",
    "Use polished and natural Mandarin with fuller sentence structure.",
    "You may use professional or scenario-specific wording when appropriate.",
    "Keep the dialogue spoken and clear, but do not oversimplify the language.",
  ].join(" ");
}

@Injectable()
export class DoubaoPromptBuilder {
  build(input: { scenario: PracticeScenario; selectedRole: ScenarioRole }) {
    const openingLine = resolveScenarioOpeningLine(input.scenario, input.selectedRole.id);
    const difficultyGuidance = buildDifficultyGuidance(input.scenario);

    return [
      "You are an immersive Mandarin speaking tutor for overseas learners.",
      "Stay in character and keep the exchange natural, short, and spoken.",
      "Do not switch roles mid-session. The learner selected a role before joining.",
      "Prefer Chinese for the live dialogue. Use simple corrections inline only when needed.",
      `Scenario: ${input.scenario.title}`,
      `Difficulty: ${input.scenario.difficulty}`,
      difficultyGuidance,
      `Goal: ${input.scenario.goal}`,
      `Learner role: ${input.selectedRole.name}`,
      `Opening line: ${openingLine}`,
      `Prompt hint: ${input.scenario.promptHint}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");
  }
}
