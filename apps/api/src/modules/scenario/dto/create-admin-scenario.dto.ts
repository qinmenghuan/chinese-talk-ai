import type { PracticeDifficulty, ScenarioType } from "@learn-chinese-ai/shared-types";
import { IsIn, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class CreateAdminScenarioDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title!: string;

  @IsString()
  @IsIn(["daily", "interview", "travel", "business"])
  type!: ScenarioType;

  @IsString()
  @IsIn(["beginner", "intermediate", "advanced"])
  difficulty!: PracticeDifficulty;

  @IsString()
  @IsUrl()
  imageUrl!: string;
}
