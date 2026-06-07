/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  CreateAdminScenarioRequest,
  UpdateAdminScenarioRequest,
} from "@learn-chinese-ai/shared-types";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminAccessGuard } from "../../common/auth/admin-access.guard";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { ScenarioService } from "./scenario.service";
import { AdminScenarioListQueryDto } from "./dto/admin-scenario-list-query.dto";
import { CreateAdminScenarioDto } from "./dto/create-admin-scenario.dto";
import { UpdateAdminScenarioDto } from "./dto/update-admin-scenario.dto";

@UseGuards(AdminAccessGuard)
@Controller("admin/scenarios")
export class AdminScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @Get()
  async list(@Query() query: AdminScenarioListQueryDto) {
    return createApiResponse(
      await this.scenarioService.listAdminScenarios({
        title: query.title,
        difficulty: query.difficulty,
        type: query.type,
        page: query.page,
        pageSize: query.pageSize,
      })
    );
  }

  @Post()
  async create(@Body() body: CreateAdminScenarioDto) {
    return createApiResponse(
      await this.scenarioService.createAdminScenario(body as CreateAdminScenarioRequest)
    );
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: UpdateAdminScenarioDto) {
    return createApiResponse(
      await this.scenarioService.updateAdminScenario(
        id,
        body as UpdateAdminScenarioRequest
      )
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return createApiResponse(await this.scenarioService.deleteAdminScenario(id));
  }
}
