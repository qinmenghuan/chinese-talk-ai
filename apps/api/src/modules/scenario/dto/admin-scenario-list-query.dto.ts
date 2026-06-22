import type { PracticeDifficulty, ScenarioType } from "@learn-chinese-ai/shared-types";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class AdminScenarioListQueryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  @IsIn(["beginner", "intermediate", "advanced"])
  difficulty?: PracticeDifficulty;

  @IsOptional()
  @IsString()
  @IsIn(["daily", "interview", "travel", "business"])
  type?: ScenarioType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number;
}
