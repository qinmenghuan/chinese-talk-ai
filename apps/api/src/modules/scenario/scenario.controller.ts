/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Get, Query } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { GetScenariosQueryDto } from "./dto/get-scenarios-query.dto";
import { ScenarioService } from "./scenario.service";

@Controller("scenarios")
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @Get()
  findAll(@Query() query: GetScenariosQueryDto) {
    const mode =
      query.mode === "free" ? "free" : query.mode === "scenario" ? "scenario" : undefined;

    return createApiResponse(this.scenarioService.getScenarios(mode));
  }
}
