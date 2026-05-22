import { Controller, Get } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";

@Controller("system-config")
export class SystemConfigController {
  @Get()
  getConfig() {
    return createApiResponse({
      realtimeProvider: "doubao",
      reportTemplate: "report-summary-v1",
      locale: "en-US"
    });
  }
}
