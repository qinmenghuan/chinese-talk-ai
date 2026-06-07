import type {
  AdminScenarioListItem,
  CreateAdminScenarioRequest,
} from "@learn-chinese-ai/shared-types";

export interface ScenariosFilters {
  title: string;
  type: string;
  difficulty: string;
}

export type ScenarioListItem = AdminScenarioListItem;
export type ScenarioEditValues = CreateAdminScenarioRequest;

export const defaultScenariosFilters: ScenariosFilters = {
  title: "",
  type: "",
  difficulty: "",
};

export const defaultScenarioEditValues: ScenarioEditValues = {
  title: "",
  type: "travel",
  difficulty: "beginner",
  imageUrl: "",
};
