/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Body, Controller, Post } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";
import { RealtimeService } from "./realtime.service";

@Controller("realtime")
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Post("session")
  createSession(@Body() dto: CreateRealtimeSessionDto) {
    return createApiResponse(this.realtimeService.createSession(dto));
  }
}
