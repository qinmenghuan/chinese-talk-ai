import type { ScenarioType } from "@learn-chinese-ai/shared-types";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class AdminConversationListQueryDto {
  @IsOptional()
  @IsString()
  startedFrom?: string;

  @IsOptional()
  @IsString()
  startedTo?: string;

  @IsOptional()
  @IsString()
  userKeyword?: string;

  @IsOptional()
  @IsString()
  title?: string;

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
