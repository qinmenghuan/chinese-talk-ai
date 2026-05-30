"use client";

import type { ConversationSummary } from "@learn-chinese-ai/shared-types";
import { Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getVisitorToken } from "../../lib/visitor-token";

function formatScore(item: ConversationSummary) {
  if (item.reportState === "score") {
    return `Score ${item.score}`;
  }

  if (item.reportState === "no_report") {
    return "No report";
  }

  return "Report pending";
}

function formatHistoryTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDifficultyLabel(difficulty: ConversationSummary["difficulty"]) {
  if (difficulty === "beginner") {
    return "Beginner / 初级";
  }

  if (difficulty === "intermediate") {
    return "Intermediate / 中级";
  }

  return "Advanced / 高级";
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
          {items.map((item) =>
            item.reportState === "score" ? (
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
                      {formatHistoryTimestamp(item.startedAt)} · {formatScore(item)}
                    </p>
                    <p className="text-sm text-[var(--color-body)]">
                      Role: {item.roleName} · Difficulty:{" "}
                      {formatDifficultyLabel(item.difficulty)}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 text-[var(--color-muted)]"
                    strokeWidth={1.8}
                  />
                </Card>
              </Link>
            ) : (
              <Card key={item.id} className="flex items-center justify-between gap-4 p-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    <Clock3 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {item.scenarioType}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--color-ink)]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--color-body)]">
                    {formatHistoryTimestamp(item.startedAt)} · {formatScore(item)}
                  </p>
                  <p className="text-sm text-[var(--color-body)]">
                    Role: {item.roleName} · Difficulty:{" "}
                    {formatDifficultyLabel(item.difficulty)}
                  </p>
                </div>
              </Card>
            )
          )}
        </div>
      </PageShell>
    </main>
  );
}
