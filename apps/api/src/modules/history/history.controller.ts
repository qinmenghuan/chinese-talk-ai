import { Controller, Get } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import type { HistoryService } from "./history.service";

@Controller("history")
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  list() {
    return createApiResponse(this.historyService.list());
  }
}
