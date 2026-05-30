/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  MessageItem,
  PracticeDifficulty,
  PracticeScenario,
  RealtimeSessionResponse,
} from "@learn-chinese-ai/shared-types";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import {
  AnonymousSessionEntity,
  ConversationEntity,
} from "../../common/database/entities";
import { resolveScenarioOpeningLine } from "../../common/scenario/resolve-scenario-opening-line";
import { volcengineConfig } from "../../common/volcengine/volcengine.config";
import { RedisService } from "../../common/redis/redis.service";
import { ScenarioService } from "../scenario/scenario.service";
import { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";
import { Inject } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";

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
    @InjectRepository(AnonymousSessionEntity)
    private readonly anonymousSessionRepository: Repository<AnonymousSessionEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    private readonly redisService: RedisService,
    private readonly scenarioService: ScenarioService,
    @Inject(volcengineConfig.KEY)
    private readonly config: ConfigType<typeof volcengineConfig>
  ) {}

  async createSession(dto: CreateRealtimeSessionDto): Promise<RealtimeSessionResponse> {
    const baseScenario = this.scenarioService.getScenarioById(dto.scenarioId, dto.mode);
    const scenario = applyScenarioDifficulty(baseScenario, dto.difficulty);
    const selectedRole = this.scenarioService.getScenarioRole(scenario, dto.roleId);
    const visitorToken = dto.visitorToken?.trim() || `visitor_${randomUUID()}`;
    const visitorTokenHash = createHash("sha256").update(visitorToken).digest("hex");
    const anonymousSession = await this.ensureAnonymousSession(visitorTokenHash);
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
      anonymousSessionId: anonymousSession.id,
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
      `Created realtime session: conversationId=${conversationId} scenario=${scenario.id} role=${selectedRole.id} difficulty=${scenario.difficulty} visitorTokenHash=${visitorTokenHash.slice(
        0,
        8
      )} model=${this.config.realtimeModel || "auto"} voice=${this.config.realtimeVoice}`
    );

    return {
      provider: "doubao",
      anonymousSessionId: anonymousSession.id,
      conversationId,
      visitorToken,
      scenario,
      selectedRole,
      conversationStatus: "active",
      initialTranscript: [openingMessage],
      providerSession: {
        transport: "websocket",
        model: this.config.realtimeModel || "auto",
        sessionToken: "managed-by-server",
        voiceId: this.config.realtimeVoice,
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

  async getConnectionContext(conversationId: string, visitorToken?: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: {
        anonymousSession: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    if (visitorToken?.trim()) {
      const visitorTokenHash = createHash("sha256")
        .update(visitorToken.trim())
        .digest("hex");

      if (conversation.anonymousSession.visitorTokenHash !== visitorTokenHash) {
        throw new BadRequestException("Realtime visitor token does not match.");
      }
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

    this.logger.log(
      `Loaded realtime connection context: conversationId=${conversationId} scenario=${scenario.id} role=${selectedRole.id} difficulty=${scenario.difficulty}`
    );

    return {
      conversation,
      scenario,
      selectedRole,
      outputSampleRate: this.config.realtimeOutputSampleRate,
    };
  }

  private async ensureAnonymousSession(visitorTokenHash: string) {
    const existing = await this.anonymousSessionRepository.findOne({
      where: { visitorTokenHash },
    });

    if (existing) {
      existing.lastSeenAt = new Date();
      return this.anonymousSessionRepository.save(existing);
    }

    return this.anonymousSessionRepository.save({
      id: `anon_${randomUUID()}`,
      visitorTokenHash,
      deviceFingerprintHash: null,
      source: "web",
      lastSeenAt: new Date(),
    });
  }

  private getTranscriptKey(conversationId: string) {
    return `lcai:rt:subtitle:${conversationId}`;
  }
}
