import type { AdminConversationListItem } from "@learn-chinese-ai/shared-types";

export interface ConversationsFilters {
  startedFrom: string;
  startedTo: string;
  userKeyword: string;
  title: string;
  type: string;
}

export type ConversationListItem = AdminConversationListItem;

export const defaultConversationsFilters: ConversationsFilters = {
  startedFrom: "",
  startedTo: "",
  userKeyword: "",
  title: "",
  type: "",
};
