"use client";

import type { PracticeDifficulty, ReportDetail } from "@learn-chinese-ai/shared-types";
import { Button, Card, PageShell } from "@learn-chinese-ai/ui";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

const scoreLabels = [
  ["Grammar", "grammarScore"],
  ["Vocabulary", "vocabularyScore"],
  ["Fluency", "fluencyScore"],
  ["Pronunciation", "pronunciationScore"],
  ["Tone", "toneScore"],
  ["Naturalness", "naturalnessScore"],
] as const;

interface ReportExperienceProps {
  conversationId: string;
}

function formatDifficultyLabel(difficulty: PracticeDifficulty) {
  if (difficulty === "beginner") {
    return "Beginner";
  }

  if (difficulty === "intermediate") {
    return "Intermediate";
  }

  return "Advanced";
}

function formatTimestamp(value: string) {
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

function formatReportState(value: ReportDetail["conversation"]["reportState"]) {
  if (value === "score") {
    return "Report ready";
  }

  if (value === "pending") {
    return "Report pending";
  }

  return "No report";
}

export function ReportExperience({ conversationId }: ReportExperienceProps) {
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadReportDetail() {
      try {
        setErrorMessage("");
        const nextDetail = await apiRequest<ReportDetail>(
          `/reports/${conversationId}/detail`
        );
        setDetail(nextDetail);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load conversation detail."
        );
      }
    }

    void loadReportDetail();
  }, [conversationId]);

  const exportPdf = () => {
    window.print();
  };

  return (
    <main>
      <PageShell className="space-y-8 pb-16">
        <div className="space-y-4">
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back to history
          </Link>
        </div>

        {!detail && !errorMessage ? (
          <Card className="p-6 text-sm text-[var(--color-body)]">
            Loading conversation detail...
          </Card>
        ) : null}

        {errorMessage ? (
          <Card className="p-6 text-sm text-[#9f1239]">{errorMessage}</Card>
        ) : null}

        {detail ? (
          <>
            <section>
              <Card className="space-y-5 border-[var(--color-hairline-soft)] p-6 shadow-[var(--shadow-float)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Session overview
                    </p>
                    <h2 className="text-2xl font-semibold text-[var(--color-ink)]">
                      {detail.conversation.title}
                    </h2>
                    <p className="text-sm leading-7 text-[var(--color-body)]">
                      {detail.conversation.goal}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="inline-flex items-center gap-2"
                    onClick={exportPdf}
                  >
                    <Download className="h-4 w-4" strokeWidth={1.8} />
                    Export PDF
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Scenario type", detail.conversation.scenarioType],
                    ["Role", detail.conversation.roleName],
                    ["Difficulty", formatDifficultyLabel(detail.conversation.difficulty)],
                    ["Time", formatTimestamp(detail.conversation.startedAt)],
                    ["Report status", formatReportState(detail.conversation.reportState)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[24px] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] px-4 py-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-[var(--color-ink)]">
                  Transcript
                </h3>
                <p className="text-sm text-[var(--color-body)]">
                  The actual conversation between the learner and the AI.
                </p>
              </div>
              <Card className="border-[var(--color-hairline-soft)] p-6 shadow-[var(--shadow-float)]">
                {detail.transcript.length > 0 ? (
                  <div className="space-y-3 text-sm leading-8 text-[var(--color-body)]">
                    {detail.transcript.map((item) => {
                      const roleLabel =
                        item.role === "assistant"
                          ? "AI"
                          : item.role === "system"
                            ? "System"
                            : "User";

                      return (
                        <p key={item.id}>
                          <span className="font-semibold text-[var(--color-ink)]">
                            {roleLabel}:
                          </span>{" "}
                          {item.content}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-body)]">
                    No transcript was saved for this conversation.
                  </p>
                )}
              </Card>
            </section>

            {detail.report ? (
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-[var(--color-ink)]">
                    Analysis
                  </h3>
                  <p className="text-sm text-[var(--color-body)]">
                    Scores, issues, and summary for this session.
                  </p>
                </div>
                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                  <Card className="space-y-6 border-[var(--color-hairline-soft)] p-6 shadow-[var(--shadow-float)]">
                    <p className="text-lg font-semibold text-[var(--color-ink)]">
                      Scores
                    </p>
                    <div className="space-y-4">
                      {scoreLabels.map(([label, key]) => {
                        const value = detail.report?.[key] ?? 0;

                        return (
                          <div key={label} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-[var(--color-body)]">{label}</span>
                              <span className="font-medium text-[var(--color-ink)]">
                                {value}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--color-surface-soft)]">
                              <div
                                className="h-2 rounded-full bg-[var(--color-primary)]"
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <div className="space-y-6">
                    <Card className="border-[var(--color-hairline-soft)] p-6 shadow-[var(--shadow-float)]">
                      <h4 className="text-lg font-semibold text-[var(--color-ink)]">
                        Summary
                      </h4>
                      <p className="mt-4 text-sm leading-8 text-[var(--color-body)]">
                        {detail.report.summary}
                      </p>
                    </Card>

                    <div className="grid gap-6">
                      <Card className="border-[var(--color-hairline-soft)] p-6">
                        <h4 className="text-lg font-semibold text-[var(--color-ink)]">
                          Issues
                        </h4>
                        {detail.report.issues.length > 0 ? (
                          <div className="mt-4 grid gap-4">
                            {detail.report.issues.map((item, index) => (
                              <div
                                key={`${item.original}-${index}`}
                                className="rounded-[24px] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] p-5"
                              >
                                <div className="grid gap-3 text-sm leading-7 text-[var(--color-body)]">
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
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm leading-7 text-[var(--color-body)]">
                            No major grammar or wording issues were found for this
                            difficulty level.
                          </p>
                        )}
                      </Card>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <Card className="border-[var(--color-hairline-soft)] p-6 text-sm text-[var(--color-body)] shadow-[var(--shadow-float)]">
                No report available for this session. The basic information and saved
                transcript are still shown above.
              </Card>
            )}
          </>
        ) : null}
      </PageShell>
    </main>
  );
}
