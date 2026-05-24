import { Controller, Get } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";

@Controller("admin")
export class AdminController {
  @Get("metrics")
  metrics() {
    return createApiResponse({
      sessionsToday: 148,
      averageScore: 84,
      realtimeFailureRate: 0.018,
    });
  }
}
