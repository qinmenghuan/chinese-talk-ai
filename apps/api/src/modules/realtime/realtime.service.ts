/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  MessageItem,
  RealtimeSessionResponse,
} from "@learn-chinese-ai/shared-types";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import {
  AnonymousSessionEntity,
  ConversationEntity,
} from "../../common/database/entities";
import { RedisService } from "../../common/redis/redis.service";
import { RtcAiVoiceService } from "../../common/volcengine/rtc-ai-voice.service";
import { RtcTokenService } from "../../common/volcengine/rtc-token.service";
import { ScenarioService } from "../scenario/scenario.service";
import { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";
import { StartRealtimeVoiceChatDto } from "./dto/start-realtime-voice-chat.dto";

@Injectable()
export class RealtimeService {
  constructor(
    @InjectRepository(AnonymousSessionEntity)
    private readonly anonymousSessionRepository: Repository<AnonymousSessionEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    private readonly redisService: RedisService,
    private readonly scenarioService: ScenarioService,
    private readonly rtcTokenService: RtcTokenService,
    private readonly rtcAiVoiceService: RtcAiVoiceService
  ) {}

  async createSession(dto: CreateRealtimeSessionDto): Promise<RealtimeSessionResponse> {
    const scenario = this.scenarioService.getScenarioById(dto.scenarioId, dto.mode);
    const selectedRole = this.scenarioService.getScenarioRole(scenario, dto.roleId);
    const visitorToken = dto.visitorToken?.trim() || `visitor_${randomUUID()}`;
    const visitorTokenHash = createHash("sha256").update(visitorToken).digest("hex");
    const anonymousSession = await this.ensureAnonymousSession(visitorTokenHash);
    const conversationId = `conv_${randomUUID()}`;
    const roomId = `${process.env.RTC_DEFAULT_ROOM_PREFIX ?? "practice"}_${conversationId}`;
    const learnerUserId = `${process.env.RTC_AI_DEFAULT_USER_ID_PREFIX ?? "visitor"}_${randomUUID().slice(0, 10)}`;
    const botUserId = `${learnerUserId}_bot`;
    const startedAt = new Date();
    const openingMessage: MessageItem = {
      id: `msg_${randomUUID()}`,
      role: "assistant",
      content: scenario.openingLine,
      contentType: "final",
      createdAt: startedAt.toISOString(),
    };

    await this.conversationRepository.save({
      id: conversationId,
      anonymousSessionId: anonymousSession.id,
      scenarioId: scenario.id,
      selectedRoleId: selectedRole.id,
      mode: scenario.mode,
      provider: "volcengine-rtc-ai",
      providerRoomId: roomId,
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
        transport: "rtc_ai",
        appId: process.env.DOUBAO_REALTIME_APP_ID ?? "",
        model: process.env.DOUBAO_REALTIME_MODEL ?? "rtc-ai",
        sessionToken: "managed-by-server",
        voiceId:
          process.env.VOLCENGINE_TTS_VOICE_TYPE ?? "zh_female_xiaohe_uranus_bigtts",
        expiresInSeconds: this.rtcTokenService.getExpiresInSeconds(),
      },
      rtc: {
        appId: process.env.VOLCENGINE_RTC_APP_ID ?? "",
        roomId,
        userId: learnerUserId,
        token: this.rtcTokenService.createJoinToken({ roomId, userId: learnerUserId }),
        botUserId,
        expiresInSeconds: this.rtcTokenService.getExpiresInSeconds(),
      },
      voiceChat: {
        provider: "volcengine-rtc-ai",
        taskId: "",
        botUserId,
        status: "starting",
        subtitleEnabled: true,
      },
    };
  }

  async startVoiceChat(conversationId: string, dto: StartRealtimeVoiceChatDto) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    if (!conversation.providerRoomId) {
      throw new BadRequestException("Conversation is missing RTC room metadata.");
    }

    if (conversation.providerRoomId !== dto.roomId) {
      throw new BadRequestException("RTC room does not match the active conversation.");
    }

    const scenario = this.scenarioService.getScenarioById(
      conversation.scenarioId as CreateRealtimeSessionDto["scenarioId"],
      conversation.mode
    );
    const selectedRole = this.scenarioService.getScenarioRole(
      scenario,
      conversation.selectedRoleId
    );
    const voiceChat = await this.rtcAiVoiceService.startVoiceChat({
      roomId: conversation.providerRoomId,
      learnerUserId: dto.userId,
      botUserId: dto.botUserId,
      scenario,
      selectedRole,
    });

    await this.conversationRepository.update(
      { id: conversation.id },
      {
        providerSessionId: voiceChat.providerSessionId,
      }
    );

    return {
      provider: "volcengine-rtc-ai" as const,
      taskId: voiceChat.taskId,
      botUserId: dto.botUserId,
      status: voiceChat.status,
      subtitleEnabled: true,
      errorMessage: voiceChat.errorMessage,
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
