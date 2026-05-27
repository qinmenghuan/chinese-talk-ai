import { IsString } from "class-validator";

export class StartRealtimeVoiceChatDto {
  @IsString()
  roomId!: string;

  @IsString()
  userId!: string;

  @IsString()
  botUserId!: string;
}
