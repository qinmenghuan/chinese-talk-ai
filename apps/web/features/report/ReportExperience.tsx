"use client";

import type { ReportSummary } from "@learn-chinese-ai/shared-types";
import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

const scoreLabels = [
  ["语法", "grammarScore"],
  ["词汇", "vocabularyScore"],
  ["流利度", "fluencyScore"],
  ["发音", "pronunciationScore"],
  ["声调", "toneScore"],
  ["自然度", "naturalnessScore"],
] as const;

interface ReportExperienceProps {
  conversationId: string;
}

export function ReportExperience({ conversationId }: ReportExperienceProps) {
  const [report, setReport] = useState<ReportSummary | null>(null);

  useEffect(() => {
    async function loadReport() {
      const nextReport = await apiRequest<ReportSummary>(`/reports/${conversationId}`);
      setReport(nextReport);
    }

    void loadReport();
  }, [conversationId]);

  const exportPdf = () => {
    window.print();
  };

  return (
    <main>
      <PageShell className="space-y-10">
        <SectionHeading
          eyebrow="Report"
          title="中文口语分析报告"
          description="报告聚焦你在本次会话中的语法、词汇、流利度、发音、声调和表达自然度。"
        />
        {!report ? (
          <Card className="p-6 text-sm text-[var(--color-body)]">
            Loading your report...
          </Card>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <Card className="space-y-6 p-6 shadow-[var(--shadow-float)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Session score
                </p>
                <div className="mt-3 text-6xl font-bold text-[var(--color-ink)]">
                  {Math.round(
                    (report.grammarScore +
                      report.vocabularyScore +
                      report.fluencyScore +
                      report.pronunciationScore +
                      report.toneScore +
                      report.naturalnessScore) /
                      6
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {scoreLabels.map(([label, key]) => {
                  const value = report[key];

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
              <Button onClick={exportPdf}>导出 PDF</Button>
            </Card>

            <div className="space-y-6">
              <Card className="p-6 shadow-[var(--shadow-float)]">
                <h3 className="text-xl font-semibold text-[var(--color-ink)]">总结</h3>
                <p className="mt-4 text-sm leading-8 text-[var(--color-body)]">
                  {report.summary}
                </p>
              </Card>
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                    优点
                  </h4>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[var(--color-body)]">
                    {report.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-6">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                    问题
                  </h4>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[var(--color-body)]">
                    {report.issues.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-6">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">
                    下一步建议
                  </h4>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[var(--color-body)]">
                    {report.suggestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </section>
        )}
      </PageShell>
    </main>
  );
}
