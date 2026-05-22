import { report } from "../../../lib/mock-data";
import { Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";

const scores = [
  ["Grammar", report.grammarScore],
  ["Vocabulary", report.vocabularyScore],
  ["Fluency", report.fluencyScore],
  ["Pronunciation", report.pronunciationScore],
  ["Naturalness", report.naturalnessScore]
] as const;

export default function ReportPage() {
  return (
    <main>
      <PageShell className="space-y-10">
        <SectionHeading
          eyebrow="Report"
          title="A concise post-session review with structured next actions."
          description="The report view should feel editorial and readable. It is not a grading spreadsheet. The goal is to show one clear summary, a few strong observations, and the next practice path."
        />
        <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <Card className="space-y-6 p-6 shadow-[var(--shadow-float)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Session score
              </p>
              <div className="mt-3 text-6xl font-bold text-[var(--color-ink)]">88</div>
            </div>
            <div className="space-y-4">
              {scores.map(([label, value]) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-body)]">{label}</span>
                    <span className="font-medium text-[var(--color-ink)]">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-surface-soft)]">
                    <div
                      className="h-2 rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 shadow-[var(--shadow-float)]">
              <h3 className="text-xl font-semibold text-[var(--color-ink)]">
                Overall summary
              </h3>
              <p className="mt-4 text-sm leading-8 text-[var(--color-body)]">
                {report.summary}
              </p>
            </Card>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-6">
                <h4 className="text-base font-semibold text-[var(--color-ink)]">
                  Strengths
                </h4>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-body)]">
                  {report.strengths.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <h4 className="text-base font-semibold text-[var(--color-ink)]">
                  Issues
                </h4>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-body)]">
                  {report.issues.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <h4 className="text-base font-semibold text-[var(--color-ink)]">
                  Next practice
                </h4>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-body)]">
                  {report.suggestions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>
      </PageShell>
    </main>
  );
}
