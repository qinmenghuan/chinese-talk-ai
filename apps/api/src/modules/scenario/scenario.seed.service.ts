import type { OnModuleInit } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import {
  PracticeScenarioEntity,
  ScenarioRoleEntity,
} from "../../common/database/entities";
import { practiceScenarios } from "./scenario.data";

@Injectable()
export class ScenarioSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(PracticeScenarioEntity)
    private readonly scenarioRepository: Repository<PracticeScenarioEntity>,
    @InjectRepository(ScenarioRoleEntity)
    private readonly roleRepository: Repository<ScenarioRoleEntity>
  ) {}

  async onModuleInit() {
    const count = await this.scenarioRepository.count();

    if (count > 0) {
      return;
    }

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
  }
}
