/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { UserAccessGuard } from "../../common/auth/user-access.guard";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { ConversationService } from "./conversation.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateConversationReplyDto } from "./dto/create-conversation-reply.dto";
import { EndConversationDto } from "./dto/end-conversation.dto";

@Controller("conversations")
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @UseGuards(UserAccessGuard)
  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateConversationDto) {
    return createApiResponse(await this.conversationService.create(user.id, dto));
  }

  @UseGuards(UserAccessGuard)
  @Post(":id/reply")
  async reply(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: CreateConversationReplyDto
  ) {
    return createApiResponse(await this.conversationService.reply(user.id, id, dto));
  }

  @UseGuards(UserAccessGuard)
  @Post(":id/close")
  async close(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: EndConversationDto
  ) {
    return createApiResponse(await this.conversationService.close(user.id, id, dto));
  }
}
