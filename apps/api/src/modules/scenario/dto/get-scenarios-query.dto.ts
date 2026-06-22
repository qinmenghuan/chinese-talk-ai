import type {
  PracticeDifficulty,
  PracticeMode,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GetScenariosQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["scenario", "free"])
  mode?: PracticeMode;

  @IsOptional()
  @IsString()
  keyword?: string;

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
