import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  PracticeDifficulty,
  PracticeMode,
  PracticeScenario,
  ScenarioListResponse,
  ScenarioId,
  ScenarioRole,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";
import { practiceScenarios } from "./scenario.data";

const DEFAULT_SCENARIO_PAGE_SIZE = 20;

@Injectable()
export class ScenarioService {
  getScenarios(input?: {
    mode?: PracticeMode;
    keyword?: string;
    difficulty?: PracticeDifficulty;
    type?: ScenarioType;
    page?: number;
    pageSize?: number;
  }): ScenarioListResponse {
    const page = input?.page && input.page > 0 ? input.page : 1;
    const pageSize =
      input?.pageSize && input.pageSize > 0
        ? Math.min(input.pageSize, DEFAULT_SCENARIO_PAGE_SIZE)
        : DEFAULT_SCENARIO_PAGE_SIZE;
    const keyword = input?.keyword?.trim().toLowerCase();

    const filtered = practiceScenarios.filter((scenario) => {
      if (input?.mode && scenario.mode !== input.mode) {
        return false;
      }

      if (input?.difficulty && scenario.difficulty !== input.difficulty) {
        return false;
      }

      if (input?.type && scenario.type !== input.type) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return (
        scenario.title.toLowerCase().includes(keyword) ||
        scenario.subtitle.toLowerCase().includes(keyword)
      );
    });
    const total = filtered.length;
    const offset = (page - 1) * pageSize;
    const items = filtered.slice(offset, offset + pageSize);

    return {
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  getScenarioById(id?: ScenarioId, mode?: PracticeMode): PracticeScenario {
    if (mode === "free" || !id) {
      const freeChatScenario = practiceScenarios.find(
        (scenario) => scenario.id === "free-chat"
      );

      if (!freeChatScenario) {
        throw new NotFoundException("Free chat scenario is not configured.");
      }

      return freeChatScenario;
    }

    const scenario = practiceScenarios.find((item) => item.id === id);

    if (!scenario) {
      throw new NotFoundException(`Scenario ${id} is not configured.`);
    }

    return scenario;
  }

  getScenarioRole(scenario: PracticeScenario, roleId?: string): ScenarioRole {
    const selectedRole = !roleId
      ? (scenario.roles.find((role) => role.id === scenario.defaultRoleId) ??
        scenario.roles[0])
      : (scenario.roles.find((role) => role.id === roleId) ??
        scenario.roles.find((role) => role.id === scenario.defaultRoleId) ??
        scenario.roles[0]);

    if (!selectedRole) {
      throw new NotFoundException(`Scenario ${scenario.id} has no available role.`);
    }

    return selectedRole;
  }
}
