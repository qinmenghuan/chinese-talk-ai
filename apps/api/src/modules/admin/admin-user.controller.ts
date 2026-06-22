/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  AdminUpdateUserRequest,
  UpdateUserStatusRequest,
} from "@learn-chinese-ai/shared-types";
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AdminAccessGuard } from "../../common/auth/admin-access.guard";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { AdminService } from "./admin.service";

@UseGuards(AdminAccessGuard)
@Controller("admin/users")
export class AdminUserController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async listUsers(
    @Query("keyword") keyword: string | undefined,
    @Query("createdFrom") createdFrom: string | undefined,
    @Query("createdTo") createdTo: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined
  ) {
    return createApiResponse(
      await this.adminService.listUsers({
        keyword,
        createdFrom,
        createdTo,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      })
    );
  }

  @Get(":id")
  async getUserDetail(@Param("id") id: string) {
    return createApiResponse(await this.adminService.getUserDetail(id));
  }

  @Patch(":id/status")
  async updateUserStatus(@Param("id") id: string, @Body() body: UpdateUserStatusRequest) {
    return createApiResponse(await this.adminService.updateUserStatus(id, body));
  }

  @Patch(":id/profile")
  async updateUserProfile(@Param("id") id: string, @Body() body: AdminUpdateUserRequest) {
    return createApiResponse(await this.adminService.updateUserProfile(id, body));
  }
}
