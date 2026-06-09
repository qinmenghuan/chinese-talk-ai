import type { ReportDetail } from "@learn-chinese-ai/shared-types";
import { Button } from "@learn-chinese-ai/ui";
import { AdminModal } from "../../components/admin/admin-modal";
import {
  formatReportDifficulty,
  formatReportStatus,
  formatReportType,
  reportScoreLabels,
} from "./reports.constants";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatRoleLabel(value: "assistant" | "system" | "user") {
  if (value === "assistant") {
    return "AI";
  }

  if (value === "system") {
    return "System";
  }

  return "User";
}

export function ReportDetailDialog({
  open,
  loading,
  detail,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  detail: ReportDetail | null;
  onClose: () => void;
}) {
  return (
    <AdminModal
      open={open}
      title={detail?.report?.title ?? "Report Detail"}
      description={
        detail
          ? `${detail.conversation.title} / ${formatReportType(detail.conversation.scenarioType)}`
          : "Review the generated report content and transcript."
      }
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-2">
        {loading ? (
          <p className="text-sm text-[var(--color-body)]">Loading report detail...</p>
        ) : null}

        {!loading && !detail ? (
          <p className="text-sm text-[var(--color-body)]">
            Report detail is not available.
          </p>
        ) : null}

        {detail ? (
          <>
            <section className="grid gap-3 md:grid-cols-2">
              {[
                ["Scenario", detail.conversation.title],
                ["Type", formatReportType(detail.conversation.scenarioType)],
                ["Role", detail.conversation.roleName],
                ["Difficulty", formatReportDifficulty(detail.conversation.difficulty)],
                ["Started", formatDateTime(detail.conversation.startedAt)],
                ["Ended", formatDateTime(detail.conversation.endedAt)],
                ["Duration", formatDuration(detail.conversation.durationSeconds)],
                ["Score", `${detail.conversation.score}`],
                [
                  "Status",
                  detail.report ? formatReportStatus(detail.report.status) : "No Report",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[20px] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-ink)]">{value}</p>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <h4 className="text-base font-semibold text-[var(--color-ink)]">Goal</h4>
              <p className="text-sm leading-7 text-[var(--color-body)]">
                {detail.conversation.goal}
              </p>
            </section>

            {detail.report ? (
              <>
                <section className="space-y-3">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                    Scores
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {reportScoreLabels.map(([label, key]) => {
                      const value = detail.report?.[key] ?? 0;

                      return (
                        <div
                          key={label}
                          className="rounded-[20px] border border-[var(--color-hairline-soft)] px-4 py-4"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--color-body)]">{label}</span>
                            <span className="font-medium text-[var(--color-ink)]">
                              {value}
                            </span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-[var(--color-surface-soft)]">
                            <div
                              className="h-2 rounded-full bg-[var(--color-primary)]"
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                    Summary
                  </h4>
                  <p className="text-sm leading-7 text-[var(--color-body)]">
                    {detail.report.summary}
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                    Strengths
                  </h4>
                  {detail.report.strengths.length > 0 ? (
                    <div className="space-y-2">
                      {detail.report.strengths.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-[20px] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm leading-7 text-[var(--color-body)]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-body)]">
                      No strengths summary was generated.
                    </p>
                  )}
                </section>

                <section className="space-y-2">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                    Issues
                  </h4>
                  {detail.report.issues.length > 0 ? (
                    <div className="space-y-3">
                      {detail.report.issues.map((item, index) => (
                        <div
                          key={`${item.original}-${index}`}
                          className="rounded-[20px] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] px-4 py-4 text-sm leading-7 text-[var(--color-body)]"
                        >
                          <p>
                            <span className="font-semibold text-[var(--color-ink)]">
                              Original:
                            </span>{" "}
                            {item.original}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--color-ink)]">
                              Problem:
                            </span>{" "}
                            {item.problem}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--color-ink)]">
                              Better:
                            </span>{" "}
                            {item.better}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--color-ink)]">
                              Note:
                            </span>{" "}
                            {item.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-body)]">
                      No major issues were recorded for this report.
                    </p>
                  )}
                </section>

                <section className="space-y-2">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                    Suggestions
                  </h4>
                  {detail.report.suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {detail.report.suggestions.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-[20px] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm leading-7 text-[var(--color-body)]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-body)]">
                      No suggestions were generated.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <section>
                <p className="text-sm text-[var(--color-body)]">
                  No report content is available for this conversation.
                </p>
              </section>
            )}

            <section className="space-y-3">
              <h4 className="text-base font-semibold text-[var(--color-ink)]">
                Transcript
              </h4>
              {detail.transcript.length > 0 ? (
                <div className="space-y-3">
                  {detail.transcript.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[20px] border border-[var(--color-hairline-soft)] px-4 py-3 text-sm leading-7 text-[var(--color-body)]"
                    >
                      <span className="font-semibold text-[var(--color-ink)]">
                        {formatRoleLabel(item.role)}:
                      </span>{" "}
                      {item.content}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-body)]">
                  No transcript was saved for this conversation.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AdminModal>
  );
}
