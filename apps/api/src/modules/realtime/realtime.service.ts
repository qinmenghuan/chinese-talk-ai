/* eslint-disable @typescript-eslint/consistent-type-imports */
import type { RealtimeSessionResponse } from "@learn-chinese-ai/shared-types";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PracticeStoreService } from "../../common/runtime/practice-store.service";
import { ScenarioService } from "../scenario/scenario.service";
import { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";

@Injectable()
export class RealtimeService {
  constructor(
    private readonly practiceStoreService: PracticeStoreService,
    private readonly scenarioService: ScenarioService
  ) {}

  createSession(dto: CreateRealtimeSessionDto): RealtimeSessionResponse {
    const scenario = this.scenarioService.getScenarioById(dto.scenarioId, dto.mode);
    const selectedRole = this.scenarioService.getScenarioRole(scenario, dto.roleId);
    const visitorToken = dto.visitorToken?.trim() || `visitor_${randomUUID()}`;
    const conversation = this.practiceStoreService.createConversation({
      visitorToken,
      scenario,
      selectedRole,
    });

    return {
      provider: "doubao",
      anonymousSessionId: conversation.anonymousSessionId,
      conversationId: conversation.id,
      visitorToken,
      scenario,
      selectedRole,
      conversationStatus: conversation.status,
      initialTranscript: conversation.transcript,
      providerSession: {
        transport: process.env.DOUBAO_REALTIME_TRANSPORT === "doubao" ? "doubao" : "mock",
        appId: process.env.DOUBAO_REALTIME_APP_ID ?? "",
        model: process.env.DOUBAO_REALTIME_MODEL ?? "doubao-realtime-preview",
        sessionToken: process.env.DOUBAO_API_KEY ?? "mock-session-token",
        voiceId: process.env.DOUBAO_REALTIME_VOICE_ID ?? "zh_female_qingxin",
        expiresInSeconds: 300,
      },
    };
  }
}
