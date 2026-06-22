import { Controller, Get } from "@nestjs/common";
import type { VoiceOption } from "@learn-chinese-ai/shared-types";
import { createApiResponse } from "../../common/dto/api-response.dto";

const voiceOptions: VoiceOption[] = [
  {
    id: "friendly-female",
    label: "Friendly Female",
    gender: "female",
    locale: "zh-CN",
    isDefault: true,
  },
  {
    id: "warm-male",
    label: "Warm Male",
    gender: "male",
    locale: "zh-CN",
    isDefault: false,
  },
  {
    id: "neutral-coach",
    label: "Neutral Coach",
    gender: "neutral",
    locale: "zh-CN",
    isDefault: false,
  },
];

@Controller("system-config")
export class SystemConfigController {
  @Get()
  getConfig() {
    return createApiResponse({
      realtimeProvider: "doubao",
      reportTemplate: "report-summary-v1",
      locale: "en-US",
      voices: voiceOptions,
    });
  }

  @Get("voices")
  getVoices() {
    return createApiResponse(voiceOptions);
  }
}
