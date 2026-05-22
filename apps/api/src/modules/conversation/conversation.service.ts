import { Injectable } from "@nestjs/common";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { EndConversationDto } from "./dto/end-conversation.dto";

@Injectable()
export class ConversationService {
  create(dto: CreateConversationDto) {
    return {
      id: "conv-demo-001",
      anonymousSessionId: dto.anonymousSessionId,
      scenarioType: dto.scenarioType,
      status: "active"
    };
  }

  close(id: string, dto: EndConversationDto) {
    return {
      id,
      status: "ended",
      savedMessages: dto.transcript.length
    };
  }
}
