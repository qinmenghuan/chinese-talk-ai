import { Body, Controller, Post } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import type { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";
import type { RealtimeService } from "./realtime.service";

@Controller("realtime")
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Post("session")
  createSession(@Body() dto: CreateRealtimeSessionDto) {
    return createApiResponse(this.realtimeService.createSession(dto));
  }
}
