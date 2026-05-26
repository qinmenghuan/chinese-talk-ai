/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  ConversationDetail,
  ConversationSummary,
} from "@learn-chinese-ai/shared-types";
import { Injectable } from "@nestjs/common";
import { PracticeStoreService } from "../../common/runtime/practice-store.service";

@Injectable()
export class HistoryService {
  constructor(private readonly practiceStoreService: PracticeStoreService) {}

  list(visitorToken: string): ConversationSummary[] {
    return this.practiceStoreService.listHistory(visitorToken);
  }

  getDetail(conversationId: string): ConversationDetail {
    return this.practiceStoreService.getConversationDetail(conversationId);
  }
}
