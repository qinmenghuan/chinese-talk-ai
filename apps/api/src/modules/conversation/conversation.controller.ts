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

  @Post()
  async create(@Body() dto: CreateConversationDto) {
    return createApiResponse(await this.conversationService.create(dto));
  }

  @Post(":id/reply")
  async reply(@Param("id") id: string, @Body() dto: CreateConversationReplyDto) {
    return createApiResponse(await this.conversationService.reply(id, dto));
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
