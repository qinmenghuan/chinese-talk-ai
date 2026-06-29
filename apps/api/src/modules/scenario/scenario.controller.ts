/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Get, Query } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { GetScenariosQueryDto } from "./dto/get-scenarios-query.dto";
import { ScenarioService } from "./scenario.service";

@Controller("scenarios")
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @Get()
  async findAll(@Query() query: GetScenariosQueryDto) {
    const mode = query.mode || undefined;

    return createApiResponse(
      await this.scenarioService.getScenarios({
        mode,
        keyword: query.keyword,
        difficulty: query.difficulty,
        type: query.type,
        page: query.page,
        pageSize: query.pageSize,
      })
    );
  }
}
