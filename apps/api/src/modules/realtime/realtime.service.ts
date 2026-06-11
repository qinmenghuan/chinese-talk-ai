/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  MessageItem,
  PracticeDifficulty,
  PracticeScenario,
  RealtimeSessionResponse,
  RealtimeTicketResponse,
} from "@learn-chinese-ai/shared-types";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import { ConversationEntity, UserPreferenceEntity } from "../../common/database/entities";
import { RedisService } from "../../common/redis/redis.service";
import { resolveScenarioOpeningLine } from "../../common/scenario/resolve-scenario-opening-line";
import { volcengineConfig } from "../../common/volcengine/volcengine.config";
import { ScenarioService } from "../scenario/scenario.service";
import { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";

function applyScenarioDifficulty(
  scenario: PracticeScenario,
  difficulty?: PracticeDifficulty | null
): PracticeScenario {
  if (!difficulty || scenario.difficulty === difficulty) {
    return scenario;
  }

  return {
    ...scenario,
    difficulty,
  };
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(UserPreferenceEntity)
    private readonly userPreferenceRepository: Repository<UserPreferenceEntity>,
    private readonly redisService: RedisService,
    private readonly scenarioService: ScenarioService,
    @Inject(volcengineConfig.KEY)
    private readonly config: ConfigType<typeof volcengineConfig>
  ) {}

  async createSession(
    userId: string,
    dto: CreateRealtimeSessionDto
  ): Promise<RealtimeSessionResponse> {
    const baseScenario = this.scenarioService.getScenarioById(dto.scenarioId, dto.mode);
    const scenario = applyScenarioDifficulty(baseScenario, dto.difficulty);
    const selectedRole = this.scenarioService.getScenarioRole(scenario, dto.roleId);
    const userPreference = await this.userPreferenceRepository.findOne({
      where: { userId },
    });
    const conversationId = `conv_${randomUUID()}`;
    const startedAt = new Date();
    const openingMessage: MessageItem = {
      id: `msg_${randomUUID()}`,
      role: "assistant",
      content: resolveScenarioOpeningLine(scenario, selectedRole.id),
      contentType: "final",
      createdAt: startedAt.toISOString(),
    };

    await this.conversationRepository.save({
      id: conversationId,
      userId,
      anonymousSessionId: null,
      scenarioId: scenario.id,
      selectedRoleId: selectedRole.id,
      selectedDifficulty: scenario.difficulty,
      mode: scenario.mode,
      provider: "doubao-realtime-ws",
      providerRoomId: null,
      providerSessionId: null,
      status: "active",
      startedAt,
      endedAt: null,
      durationSeconds: 0,
    });

    await this.redisService.setJson(
      this.getTranscriptKey(conversationId),
      [openingMessage],
      600
    );

    this.logger.log(
      `Created realtime session: conversationId=${conversationId} userId=${userId} scenario=${scenario.id} role=${selectedRole.id} difficulty=${scenario.difficulty}`
    );

    return {
      provider: "doubao",
      conversationId,
      scenario,
      selectedRole,
      conversationStatus: "active",
      initialTranscript: [openingMessage],
      providerSession: {
        transport: "websocket",
        model: this.config.realtimeModel || "auto",
        sessionToken: "managed-by-server",
        voiceId: userPreference?.preferredVoiceId ?? this.config.realtimeVoice,
        websocketPath: "/api/realtime/ws",
        inputAudioFormat: "pcm16",
        outputAudioFormat: "pcm16",
        inputSampleRate: this.config.realtimeInputSampleRate,
        outputSampleRate: this.config.realtimeOutputSampleRate,
        vadSilenceMs: this.config.realtimeVadSilenceMs,
        expiresInSeconds: 3600,
      },
    };
  }

  async createRealtimeTicket(
    userId: string,
    conversationId: string
  ): Promise<RealtimeTicketResponse> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException("Conversation not found.");
    }

    const ticket = `rt_${randomUUID().replace(/-/g, "")}`;
    const expiresInSeconds = 60;
    await this.redisService.setJson(
      this.getRealtimeTicketKey(ticket),
      {
        userId,
        conversationId,
      },
      expiresInSeconds
    );

    return {
      ticket,
      expiresInSeconds,
    };
  }

  async consumeRealtimeTicket(ticket: string, conversationId: string) {
    const stored = await this.redisService.getJson<{
      userId?: string;
      conversationId?: string;
    } | null>(this.getRealtimeTicketKey(ticket), null);

    if (!stored?.userId || stored.conversationId !== conversationId) {
      throw new BadRequestException("Realtime ticket is invalid or expired.");
    }

    await this.redisService.delete(this.getRealtimeTicketKey(ticket));
    return stored.userId;
  }

  async getConnectionContext(conversationId: string, userId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    if (conversation.userId !== userId) {
      throw new BadRequestException("Realtime conversation does not belong to user.");
    }

    const baseScenario = this.scenarioService.getScenarioById(
      conversation.scenarioId as CreateRealtimeSessionDto["scenarioId"],
      conversation.mode
    );
    const scenario = applyScenarioDifficulty(
      baseScenario,
      conversation.selectedDifficulty
    );
    const selectedRole = this.scenarioService.getScenarioRole(
      scenario,
      conversation.selectedRoleId
    );
    const preference = await this.userPreferenceRepository.findOne({
      where: { userId },
    });

    return {
      conversation,
      scenario,
      selectedRole,
      outputSampleRate: this.config.realtimeOutputSampleRate,
      preferredVoiceId: preference?.preferredVoiceId ?? this.config.realtimeVoice,
    };
  }

  private getTranscriptKey(conversationId: string) {
    return `lcai:rt:subtitle:${conversationId}`;
  }

  private getRealtimeTicketKey(ticket: string) {
    return `lcai:auth:realtime-ticket:${ticket}`;
  }
}
