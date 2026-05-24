import { Controller, Get } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return createApiResponse({
      status: "ok",
      service: "learn-chinese-ai-api",
    });
  }
}
