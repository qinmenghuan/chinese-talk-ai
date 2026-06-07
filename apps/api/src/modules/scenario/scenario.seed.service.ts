/* eslint-disable @typescript-eslint/consistent-type-imports */
import type { OnModuleInit } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import {
  PracticeScenarioEntity,
  ScenarioRoleEntity,
} from "../../common/database/entities";
import { defaultAdminScenarios } from "./admin-scenario.data";
import { practiceScenarios } from "./scenario.data";
import { ScenarioService } from "./scenario.service";

@Injectable()
export class ScenarioSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(PracticeScenarioEntity)
    private readonly scenarioRepository: Repository<PracticeScenarioEntity>,
    @InjectRepository(ScenarioRoleEntity)
    private readonly roleRepository: Repository<ScenarioRoleEntity>,
    private readonly scenarioService: ScenarioService
  ) {}

  async onModuleInit() {
    for (const scenario of practiceScenarios) {
      await this.scenarioRepository.save({
        id: scenario.id,
        type: scenario.type,
        title: scenario.title,
        subtitle: scenario.subtitle,
        mode: scenario.mode,
        difficulty: scenario.difficulty,
        goal: scenario.goal,
        coverUrl: scenario.cover,
        defaultRoleId: scenario.defaultRoleId,
        openingLine: scenario.openingLine,
        promptHint: scenario.promptHint,
        isActive: true,
      });

      await this.roleRepository.save(
        scenario.roles.map((role, index) => ({
          id: role.id,
          scenarioId: scenario.id,
          code: role.code,
          name: role.name,
          description: role.description,
          isAiRole: role.isAiRole,
          sortOrder: index,
        }))
      );
    }

    for (const scenario of defaultAdminScenarios) {
      await this.scenarioService.createMissingAdminScenarioSeed(scenario);
    }
  }
}
