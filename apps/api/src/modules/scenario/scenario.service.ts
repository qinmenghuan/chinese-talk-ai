import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  PracticeMode,
  PracticeScenario,
  ScenarioId,
  ScenarioRole,
} from "@learn-chinese-ai/shared-types";
import { practiceScenarios } from "./scenario.data";

@Injectable()
export class ScenarioService {
  getScenarios(mode?: PracticeMode): PracticeScenario[] {
    if (!mode) {
      return practiceScenarios;
    }

    return practiceScenarios.filter((scenario) => scenario.mode === mode);
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
