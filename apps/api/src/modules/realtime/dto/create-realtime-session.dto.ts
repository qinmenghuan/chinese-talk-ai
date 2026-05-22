import { IsIn, IsString } from "class-validator";

export class CreateRealtimeSessionDto {
  @IsString()
  @IsIn(["daily", "interview", "travel", "business"])
  scenarioType!: "daily" | "interview" | "travel" | "business";
}
