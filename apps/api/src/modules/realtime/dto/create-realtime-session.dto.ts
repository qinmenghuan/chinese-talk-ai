import type { PracticeMode, ScenarioId } from "@learn-chinese-ai/shared-types";
import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateRealtimeSessionDto {
  @IsOptional()
  @IsString()
  @IsIn([
    "daily-cafe",
    "interview-intro",
    "travel-hotel",
    "business-meeting",
    "free-chat",
  ])
  scenarioId?: ScenarioId;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  @IsIn(["scenario", "free"])
  mode?: PracticeMode;

  @IsOptional()
  @IsString()
  visitorToken?: string;
}
