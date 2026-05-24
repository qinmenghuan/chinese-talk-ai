import { Injectable } from "@nestjs/common";
import type { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";

@Injectable()
export class RealtimeService {
  createSession(dto: CreateRealtimeSessionDto) {
    return {
      provider: "doubao",
      conversationId: "conv-demo-001",
      anonymousSessionId: "anon-demo-001",
      scenarioType: dto.scenarioType,
      sessionToken: "replace-with-real-provider-session-token",
      expiresInSeconds: 300,
    };
  }
}
