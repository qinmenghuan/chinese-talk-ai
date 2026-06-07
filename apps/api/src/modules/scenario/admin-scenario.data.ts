import type {
  CreateAdminScenarioRequest,
  PracticeDifficulty,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";

export const defaultAdminScenarios: CreateAdminScenarioRequest[] = [
  {
    title: "买飞机票",
    type: "travel",
    difficulty: "beginner",
    imageUrl:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "买衣服",
    type: "travel",
    difficulty: "beginner",
    imageUrl:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "交朋友",
    type: "travel",
    difficulty: "beginner",
    imageUrl:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "餐厅点餐",
    type: "travel",
    difficulty: "beginner",
    imageUrl:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "买水果",
    type: "travel",
    difficulty: "beginner",
    imageUrl:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "约朋友周末吃饭",
    type: "travel",
    difficulty: "beginner",
    imageUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "买火车票",
    type: "travel",
    difficulty: "beginner",
    imageUrl:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80",
  },
];

export function createScenarioId(type: ScenarioType, title: string) {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const compact = normalized || "scenario";
  const suffix = Date.now().toString(36).slice(-6);

  return `${type}-${compact}-${suffix}`.slice(0, 64);
}

export function createScenarioSubtitle(title: string, type: ScenarioType) {
  const typeLabels: Record<ScenarioType, string> = {
    daily: "daily life",
    interview: "interview conversation",
    travel: "travel conversation",
    business: "business conversation",
  };

  return `Practice the "${title}" ${typeLabels[type]} with guided speaking turns.`;
}

export function createScenarioGoal(title: string, type: ScenarioType) {
  const typeLabels: Record<ScenarioType, string> = {
    daily: "daily speaking confidence",
    interview: "interview speaking confidence",
    travel: "travel speaking confidence",
    business: "business speaking confidence",
  };

  return `Help the learner build ${typeLabels[type]} through the "${title}" topic.`;
}

export function createScenarioOpeningLine(title: string) {
  return `你好，我们来练习“${title}”这个话题。你可以先开始。`;
}

export function createScenarioPromptHint(title: string, difficulty: PracticeDifficulty) {
  const difficultyHint =
    difficulty === "beginner"
      ? "Keep the exchange simple and supportive."
      : difficulty === "intermediate"
        ? "Use natural everyday Chinese with a little variety."
        : "Use more complete and polished sentence structures.";

  return `${difficultyHint} Stay focused on the "${title}" topic.`;
}

export function createScenarioRoleIds(scenarioId: string) {
  return {
    learnerRoleId: `${scenarioId}-learner`,
    tutorRoleId: `${scenarioId}-tutor`,
  };
}
