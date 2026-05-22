import { IsIn, IsString } from "class-validator";

export class CreateConversationDto {
  @IsString()
  anonymousSessionId!: string;

  @IsString()
  @IsIn(["daily", "interview", "travel", "business"])
  scenarioType!: "daily" | "interview" | "travel" | "business";
}
