/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Delete, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AdminAccessGuard } from "../../common/auth/admin-access.guard";
import { CurrentAdmin } from "../../common/auth/current-admin.decorator";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { ConversationService } from "./conversation.service";
import { AdminConversationListQueryDto } from "./dto/admin-conversation-list-query.dto";

@UseGuards(AdminAccessGuard)
@Controller("admin/conversations")
export class AdminConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  async list(@Query() query: AdminConversationListQueryDto) {
    return createApiResponse(
      await this.conversationService.listAdminConversations({
        startedFrom: query.startedFrom,
        startedTo: query.startedTo,
        userKeyword: query.userKeyword,
        title: query.title,
        type: query.type,
        page: query.page,
        pageSize: query.pageSize,
      })
    );
  }

  @Delete(":id")
  async remove(@CurrentAdmin() admin: { id: string }, @Param("id") id: string) {
    return createApiResponse(
      await this.conversationService.deleteConversationByAdmin(id, admin.id)
    );
  }
}
