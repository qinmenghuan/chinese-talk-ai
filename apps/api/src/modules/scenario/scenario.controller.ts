import { Controller, Get } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { ScenarioService } from "./scenario.service";

@Controller("scenarios")
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @Get()
  findAll() {
    return createApiResponse(this.scenarioService.getScenarios());
  }
}
