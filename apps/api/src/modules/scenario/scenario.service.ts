/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  AdminScenarioListItem,
  AdminScenarioListResponse,
  CreateAdminScenarioRequest,
  DeleteAdminScenarioResponse,
  UpdateAdminScenarioRequest,
} from "@learn-chinese-ai/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import type {
  PracticeDifficulty,
  PracticeMode,
  PracticeScenario,
  ScenarioListResponse,
  ScenarioId,
  ScenarioRole,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";
import {
  PracticeScenarioEntity,
  ScenarioRoleEntity,
} from "../../common/database/entities";
import {
  type DefaultAdminScenarioSeed,
  createScenarioGoal,
  createScenarioId,
  createScenarioOpeningLine,
  createScenarioPromptHint,
  createScenarioRoleIds,
  createScenarioSubtitle,
} from "./admin-scenario.data";
import { practiceScenarios } from "./scenario.data";
import { DEFAULT_PAGE_SIZE } from "../../common/const";

@Injectable()
export class ScenarioService {
  constructor(
    @InjectRepository(PracticeScenarioEntity)
    private readonly scenarioRepository: Repository<PracticeScenarioEntity>
  ) {}

  async getScenarios(input?: {
    mode?: PracticeMode;
    keyword?: string;
    difficulty?: PracticeDifficulty;
    type?: ScenarioType;
    page?: number;
    pageSize?: number;
  }): Promise<ScenarioListResponse> {
    const page = input?.page && input.page > 0 ? input.page : 1;
    const pageSize =
      input?.pageSize && input.pageSize > 0
        ? Math.min(input.pageSize, DEFAULT_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;
    const keyword = input?.keyword?.trim().toLowerCase();
    const queryBuilder = this.scenarioRepository.createQueryBuilder("scenario");

    // Keep the public web list backed by persisted scenarios so admin changes are visible.
    queryBuilder
      .leftJoinAndSelect("scenario.roles", "role")
      .where("scenario.is_active = :isActive", { isActive: true });

    if (input?.mode) {
      queryBuilder.andWhere("scenario.mode = :mode", { mode: input.mode });
    }

    if (input?.difficulty) {
      queryBuilder.andWhere("scenario.difficulty = :difficulty", {
        difficulty: input.difficulty,
      });
    }

    if (input?.type) {
      queryBuilder.andWhere("scenario.type = :type", { type: input.type });
    }

    if (keyword) {
      queryBuilder.andWhere(
        "(LOWER(scenario.title) LIKE :keyword OR LOWER(scenario.subtitle) LIKE :keyword)",
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder.orderBy("scenario.created_at", "ASC");
    queryBuilder.addOrderBy("role.sort_order", "ASC");
    queryBuilder.addOrderBy("role.created_at", "ASC");
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [scenarios, total] = await queryBuilder.getManyAndCount();

    return {
      items: scenarios.map((scenario) => this.toPracticeScenario(scenario)),
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

  async listAdminScenarios(input: {
    title?: string;
    difficulty?: PracticeDifficulty;
    type?: ScenarioType;
    page?: number;
    pageSize?: number;
  }): Promise<AdminScenarioListResponse> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize =
      input.pageSize && input.pageSize > 0
        ? Math.min(input.pageSize, DEFAULT_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;
    const queryBuilder = this.scenarioRepository.createQueryBuilder("scenario");

    queryBuilder.where("scenario.mode = :mode", {
      mode: "scenario",
    });

    if (input.title?.trim()) {
      queryBuilder.andWhere("LOWER(scenario.title) LIKE :title", {
        title: `%${input.title.trim().toLowerCase()}%`,
      });
    }

    if (input.difficulty) {
      queryBuilder.andWhere("scenario.difficulty = :difficulty", {
        difficulty: input.difficulty,
      });
    }

    if (input.type) {
      queryBuilder.andWhere("scenario.type = :type", {
        type: input.type,
      });
    }

    queryBuilder.orderBy("scenario.updated_at", "DESC");
    queryBuilder.addOrderBy("scenario.created_at", "DESC");
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items: items.map((item) => this.toAdminScenarioListItem(item)),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  async createAdminScenario(
    input: CreateAdminScenarioRequest
  ): Promise<AdminScenarioListItem> {
    const normalized = this.normalizeAdminScenarioInput(input);
    const id = createScenarioId(normalized.type, normalized.title);
    const roleIds = createScenarioRoleIds(id);

    await this.scenarioRepository.manager.transaction(async (manager) => {
      await manager.getRepository(PracticeScenarioEntity).save({
        id,
        title: normalized.title,
        type: normalized.type,
        difficulty: normalized.difficulty,
        subtitle: createScenarioSubtitle(normalized.title, normalized.type),
        mode: "scenario",
        goal: createScenarioGoal(normalized.title, normalized.type),
        coverUrl: normalized.imageUrl,
        defaultRoleId: roleIds.learnerRoleId,
        openingLine: createScenarioOpeningLine(normalized.title),
        promptHint: createScenarioPromptHint(normalized.title, normalized.difficulty),
        isActive: true,
      });

      await manager.getRepository(ScenarioRoleEntity).save([
        {
          id: roleIds.learnerRoleId,
          scenarioId: id,
          code: "learner",
          name: "Learner",
          description: `The learner practices the "${normalized.title}" topic.`,
          isAiRole: false,
          sortOrder: 0,
        },
        {
          id: roleIds.tutorRoleId,
          scenarioId: id,
          code: "tutor",
          name: "Chinese Tutor",
          description: `The AI guides the "${normalized.title}" topic with supportive follow-up questions.`,
          isAiRole: true,
          sortOrder: 1,
        },
      ]);
    });

    return this.getAdminScenarioOrThrow(id);
  }

  async updateAdminScenario(
    id: string,
    input: UpdateAdminScenarioRequest
  ): Promise<AdminScenarioListItem> {
    const scenario = await this.requireScenarioEntity(id);
    const normalized = this.normalizeAdminScenarioInput(input);

    scenario.title = normalized.title;
    scenario.type = normalized.type;
    scenario.difficulty = normalized.difficulty;
    scenario.subtitle = createScenarioSubtitle(normalized.title, normalized.type);
    scenario.goal = createScenarioGoal(normalized.title, normalized.type);
    scenario.coverUrl = normalized.imageUrl;
    scenario.openingLine = createScenarioOpeningLine(normalized.title);
    scenario.promptHint = createScenarioPromptHint(
      normalized.title,
      normalized.difficulty
    );

    await this.scenarioRepository.save(scenario);

    return this.toAdminScenarioListItem(scenario);
  }

  async deleteAdminScenario(id: string): Promise<DeleteAdminScenarioResponse> {
    await this.requireScenarioEntity(id);
    await this.scenarioRepository.delete({
      id,
    });

    return {
      success: true,
    };
  }

  async createMissingAdminScenarioSeed(input: CreateAdminScenarioRequest) {
    const normalized = this.normalizeAdminScenarioInput(input);
    const defaultSeedInput = input as DefaultAdminScenarioSeed;
    const existing = await this.scenarioRepository.findOne({
      where: {
        title: normalized.title,
        type: normalized.type,
        difficulty: normalized.difficulty,
        mode: "scenario",
      },
    });

    if (existing) {
      const nextOpeningLine =
        defaultSeedInput.openingLineChinese ??
        createScenarioOpeningLine(normalized.title);

      existing.title = normalized.title;
      existing.type = normalized.type;
      existing.difficulty = normalized.difficulty;
      existing.subtitle = createScenarioSubtitle(normalized.title, normalized.type);
      existing.goal = createScenarioGoal(normalized.title, normalized.type);
      existing.coverUrl = normalized.imageUrl;
      existing.openingLine = nextOpeningLine;
      existing.promptHint = createScenarioPromptHint(
        normalized.title,
        normalized.difficulty
      );
      await this.scenarioRepository.save(existing);
      return existing;
    }

    if (defaultSeedInput.legacyTitles.length > 0) {
      const legacy = await this.scenarioRepository.findOne({
        where: {
          title: In(defaultSeedInput.legacyTitles),
          type: normalized.type,
          difficulty: normalized.difficulty,
          mode: "scenario",
        },
      });

      if (legacy) {
        legacy.title = normalized.title;
        legacy.type = normalized.type;
        legacy.difficulty = normalized.difficulty;
        legacy.subtitle = createScenarioSubtitle(normalized.title, normalized.type);
        legacy.goal = createScenarioGoal(normalized.title, normalized.type);
        legacy.coverUrl = normalized.imageUrl;
        legacy.openingLine =
          defaultSeedInput.openingLineChinese ??
          createScenarioOpeningLine(normalized.title);
        legacy.promptHint = createScenarioPromptHint(
          normalized.title,
          normalized.difficulty
        );
        await this.scenarioRepository.save(legacy);
        return legacy;
      }
    }

    await this.createAdminScenario(normalized);

    return this.scenarioRepository.findOne({
      where: {
        title: normalized.title,
        type: normalized.type,
        difficulty: normalized.difficulty,
        mode: "scenario",
      },
    });
  }

  private async getAdminScenarioOrThrow(id: string) {
    const scenario = await this.requireScenarioEntity(id);
    return this.toAdminScenarioListItem(scenario);
  }

  private async requireScenarioEntity(id: string) {
    const scenario = await this.scenarioRepository.findOne({
      where: { id },
    });

    if (!scenario || scenario.mode !== "scenario") {
      throw new NotFoundException(`Scenario ${id} was not found.`);
    }

    return scenario;
  }

  private normalizeAdminScenarioInput<T extends CreateAdminScenarioRequest>(input: T): T {
    return {
      ...input,
      title: input.title.trim(),
      imageUrl: input.imageUrl.trim(),
    };
  }

  private toAdminScenarioListItem(
    scenario: PracticeScenarioEntity
  ): AdminScenarioListItem {
    return {
      id: scenario.id,
      title: scenario.title,
      type: scenario.type,
      difficulty: scenario.difficulty,
      imageUrl: scenario.coverUrl,
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString(),
    };
  }

  private toPracticeScenario(scenario: PracticeScenarioEntity): PracticeScenario {
    const roles = [...(scenario.roles ?? [])].sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.createdAt.getTime() - right.createdAt.getTime()
    );

    return {
      id: scenario.id,
      type: scenario.type,
      title: scenario.title,
      subtitle: scenario.subtitle,
      difficulty: scenario.difficulty,
      cover: scenario.coverUrl,
      goal: scenario.goal,
      mode: scenario.mode,
      roles: roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isAiRole: role.isAiRole,
      })),
      defaultRoleId: scenario.defaultRoleId,
      openingLine: scenario.openingLine,
      // Role-specific opening lines are not stored separately yet, so use the persisted default line.
      openingLinesByRoleId: {
        [scenario.defaultRoleId]: scenario.openingLine,
      },
      promptHint: scenario.promptHint,
    };
  }
}
