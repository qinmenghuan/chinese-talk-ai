/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminAccessGuard } from "../../common/auth/admin-access.guard";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { AdminService } from "./admin.service";

@UseGuards(AdminAccessGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("metrics")
  async metrics() {
    return createApiResponse(await this.adminService.getMetrics());
  }
}
