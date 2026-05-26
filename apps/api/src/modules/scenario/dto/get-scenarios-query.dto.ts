import type { PracticeMode } from "@learn-chinese-ai/shared-types";
import { IsIn, IsOptional, IsString } from "class-validator";

export class GetScenariosQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["scenario", "free"])
  mode?: PracticeMode;
}
