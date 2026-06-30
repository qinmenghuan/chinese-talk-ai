"use client";

import type {
  ConversationSummary,
  HistoryListResponse,
} from "@learn-chinese-ai/shared-types";
import { Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { getCurrentPath } from "../../lib/auth-guard";
import { apiRequest } from "../../lib/api";

const HISTORY_PAGE_SIZE = 20;
const HISTORY_CACHE_KEY = "history-page-cache";

interface HistoryPageCache {
  items: ConversationSummary[];
  currentPage: number;
  hasMore: boolean;
  scrollY: number;
}

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
    return "Beginner";
  }

  if (difficulty === "intermediate") {
    return "Intermediate";
  }

  return "Advanced";
}

export function HistoryExperience() {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const initialLoadHandledRef = useRef(false);
  const { status, session, requireAuth } = useAuth();
  const userId = session?.user.id;
  const requestAuth = useEffectEvent(() => {
    requireAuth(getCurrentPath("/history"));
  });

  function getHistoryCacheKey(currentUserId: string) {
    return `${HISTORY_CACHE_KEY}:${currentUserId}`;
  }

  function readHistoryCache(currentUserId: string): HistoryPageCache | null {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.sessionStorage.getItem(getHistoryCacheKey(currentUserId));

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as HistoryPageCache;
    } catch {
      window.sessionStorage.removeItem(getHistoryCacheKey(currentUserId));
      return null;
    }
  }

  function writeHistoryCache(currentUserId: string, next: HistoryPageCache) {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      getHistoryCacheKey(currentUserId),
      JSON.stringify(next)
    );
  }

  async function loadHistoryPage(page: number) {
    return apiRequest<HistoryListResponse>(
      `/history?page=${page}&pageSize=${HISTORY_PAGE_SIZE}`
    );
  }

  useEffect(() => {
    if (status === "anonymous") {
      requestAuth();
    }
  }, [requestAuth, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      initialLoadHandledRef.current = false;
      return;
    }

    if (!userId) {
      return;
    }

    const currentUserId = userId;

    async function loadHistory() {
      const cached = readHistoryCache(currentUserId);

      if (cached) {
        setItems(cached.items);
        setCurrentPage(cached.currentPage);
        setHasMore(cached.hasMore);
        setLoading(false);

        window.requestAnimationFrame(() => {
          window.scrollTo({ top: cached.scrollY, behavior: "auto" });
        });
      }

      try {
        setErrorMessage("");
        const response = await loadHistoryPage(1);
        setItems(response.items);
        setCurrentPage(response.page);
        setHasMore(response.hasMore);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load practice history."
        );
      } finally {
        setLoading(false);
      }
    }

    initialLoadHandledRef.current = true;
    void loadHistory();
  }, [status, userId]);

  useEffect(() => {
    if (loading || !initialLoadHandledRef.current || !userId) {
      return;
    }

    // 中文注释：在用户浏览历史记录时，将当前页面数据和滚动位置缓存到 sessionStorage 中，以便用户刷新页面或返回历史记录列表时能够恢复到之前的状态。
    writeHistoryCache(userId, {
      items,
      currentPage,
      hasMore,
      scrollY: typeof window === "undefined" ? 0 : window.scrollY,
    });
  }, [currentPage, hasMore, items, loading, userId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      if (loading || !userId) {
        return;
      }

      writeHistoryCache(userId, {
        items,
        currentPage,
        hasMore,
        scrollY: window.scrollY,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [currentPage, hasMore, items, loading, userId]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const anchor = loadMoreAnchorRef.current;

    if (!anchor || loading || loadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;

      if (!entry?.isIntersecting) {
        return;
      }

      setLoadingMore(true);
      setErrorMessage("");

      void (async () => {
        try {
          const response = await loadHistoryPage(currentPage + 1);
          setItems((current) => [...current, ...response.items]);
          setCurrentPage(response.page);
          setHasMore(response.hasMore);
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load more history."
          );
        } finally {
          setLoadingMore(false);
        }
      })();
    });

    observer.observe(anchor);

    return () => {
      observer.disconnect();
    };
  }, [currentPage, hasMore, loading, loadingMore, status]);

  if (status !== "authenticated") {
    return (
      <main>
        <PageShell className="space-y-10">
          <SectionHeading eyebrow="History" title="Conversation history" />
          <Card className="p-5 text-sm text-[var(--color-body)]">
            Redirecting to sign in...
          </Card>
        </PageShell>
      </main>
    );
  }

  return (
    <main>
      <PageShell className="space-y-10">
        <SectionHeading eyebrow="History" title="Conversation history" />
        <div className="grid gap-4">
          {loading ? (
            <Card className="p-5 text-sm text-[var(--color-body)]">
              Loading your practice history...
            </Card>
          ) : null}
          {!loading && items.length === 0 ? (
            <Card className="p-5 text-sm text-[var(--color-body)]">
              No history yet. Pick a scenario from the home page to start practicing.
            </Card>
          ) : null}
          {!loading && errorMessage ? (
            <Card className="p-5 text-sm text-[#9f1239]">{errorMessage}</Card>
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
          ))}
          {!loading && loadingMore ? (
            <Card className="p-5 text-sm text-[var(--color-body)]">
              Loading more practice history...
            </Card>
          ) : null}
          {!loading && hasMore ? (
            <div ref={loadMoreAnchorRef} aria-hidden="true" />
          ) : null}
        </div>
      </PageShell>
    </main>
  );
}
