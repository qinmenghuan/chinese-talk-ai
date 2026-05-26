import { IsString, MinLength } from "class-validator";

export class CreateConversationReplyDto {
  @IsString()
  @MinLength(1)
  content!: string;
}
