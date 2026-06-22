/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { UserAccessGuard } from "../../common/auth/user-access.guard";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { CreateRealtimeTicketDto } from "./dto/create-realtime-ticket.dto";
import { CreateRealtimeSessionDto } from "./dto/create-realtime-session.dto";
import { RealtimeService } from "./realtime.service";

@Controller("realtime")
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @UseGuards(UserAccessGuard)
  @Post("session")
  async createSession(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRealtimeSessionDto
  ) {
    return createApiResponse(await this.realtimeService.createSession(user.id, dto));
  }

  @UseGuards(UserAccessGuard)
  @Post("ticket")
  async createTicket(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRealtimeTicketDto
  ) {
    return createApiResponse(
      await this.realtimeService.createRealtimeTicket(user.id, dto.conversationId)
    );
  }
}
