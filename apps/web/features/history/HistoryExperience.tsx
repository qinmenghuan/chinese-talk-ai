"use client";

import type { ConversationSummary } from "@learn-chinese-ai/shared-types";
import { Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getVisitorToken } from "../../lib/visitor-token";

function formatScore(item: ConversationSummary) {
  return item.score > 0 ? `Score ${item.score}` : "Report pending";
}

export function HistoryExperience() {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const visitorToken = getVisitorToken();
        const historyItems = await apiRequest<ConversationSummary[]>(
          `/history?visitorToken=${encodeURIComponent(visitorToken)}`
        );
        setItems(historyItems);
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, []);

  return (
    <main>
      <PageShell className="space-y-10">
        <SectionHeading
          eyebrow="History"
          title="回看你的对话记录和练习结果"
          description="每次会话都会保留场景、时间、角色和报告分数，方便你回顾练习表现。"
        />
        <div className="grid gap-4">
          {loading ? (
            <Card className="p-5 text-sm text-[var(--color-body)]">
              Loading your practice history...
            </Card>
          ) : null}
          {!loading && items.length === 0 ? (
            <Card className="p-5 text-sm text-[var(--color-body)]">
              还没有历史记录，先去首页选择一个主题开始练习。
            </Card>
          ) : null}
          {items.map((item) => (
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
                    {item.startedAt} · {formatScore(item)} · {item.roleName}
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
