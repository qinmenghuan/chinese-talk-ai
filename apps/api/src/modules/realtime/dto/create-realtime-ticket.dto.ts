import { IsString } from "class-validator";

export class CreateRealtimeTicketDto {
  @IsString()
  conversationId!: string;
}
