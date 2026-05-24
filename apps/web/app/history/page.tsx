import Link from "next/link";
import { Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { ChevronRight, Clock3 } from "lucide-react";
import { historyItems } from "../../lib/mock-data";

export default function HistoryPage() {
  return (
    <main>
      <PageShell className="space-y-10">
        <SectionHeading
          eyebrow="History"
          title="A quiet history page for replay, review, and return."
          description="History should read like a clean archive, not a noisy dashboard. Each row keeps only what matters: scenario, time, and the result that drives the next practice choice."
        />
        <div className="grid gap-4">
          {historyItems.map((item) => (
            <Link key={item.id} href={`/reports/${item.id}`}>
              <Card className="flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-float)]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    <Clock3 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {item.scenarioType}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--color-ink)]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--color-body)]">
                    {item.startedAt} · Score {item.score}
                  </p>
                </div>
                <ChevronRight
                  className="h-5 w-5 text-[var(--color-muted)]"
                  strokeWidth={1.8}
                />
              </Card>
            </Link>
          ))}
        </div>
      </PageShell>
    </main>
  );
}
