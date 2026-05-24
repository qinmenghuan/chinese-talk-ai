import { Body, Controller, Param, Post } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import type { ConversationService } from "./conversation.service";
import type { CreateConversationDto } from "./dto/create-conversation.dto";
import type { EndConversationDto } from "./dto/end-conversation.dto";

@Controller("conversations")
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  create(@Body() dto: CreateConversationDto) {
    return createApiResponse(this.conversationService.create(dto));
  }

  @Post(":id/close")
  close(@Param("id") id: string, @Body() dto: EndConversationDto) {
    return createApiResponse(this.conversationService.close(id, dto));
  }
}
