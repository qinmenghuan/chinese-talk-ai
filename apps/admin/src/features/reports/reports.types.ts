import type { AdminReportListItem } from "@learn-chinese-ai/shared-types";

export interface ReportsFilters {
  startedFrom: string;
  startedTo: string;
  userKeyword: string;
  title: string;
  type: string;
}

export type ReportListItem = AdminReportListItem;

export const defaultReportsFilters: ReportsFilters = {
  startedFrom: "",
  startedTo: "",
  userKeyword: "",
  title: "",
  type: "",
};
