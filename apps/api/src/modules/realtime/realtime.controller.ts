/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Body, Controller, Param, Post } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";
import { StartRealtimeVoiceChatDto } from "./dto/start-realtime-voice-chat.dto";
import { RealtimeService } from "./realtime.service";

@Controller("realtime")
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Post("session")
  async createSession(@Body() dto: CreateRealtimeSessionDto) {
    return createApiResponse(await this.realtimeService.createSession(dto));
  }

  @Post("session/:conversationId/start")
  async startVoiceChat(
    @Param("conversationId") conversationId: string,
    @Body() dto: StartRealtimeVoiceChatDto
  ) {
    return createApiResponse(
      await this.realtimeService.startVoiceChat(conversationId, dto)
    );
  }
}
