"use client";

import type { ScenarioListResponse } from "@learn-chinese-ai/shared-types";
import { Button, Card, PageShell } from "@learn-chinese-ai/ui";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScenarioCard } from "../../components/ScenarioCard";
import { apiRequest } from "../../lib/api";
import {
  DISCOVERY_CACHE_KEY,
  defaultFilters,
  parseDiscoveryCache,
  type DiscoveryFilters,
  type DiscoveryPageCache,
  serializeDiscoveryCache,
} from "./discovery-cache";

const PAGE_SIZE = 20;

export function DiscoveryExperience() {
  // 中文注释：draftFilters 用于存储用户在表单中输入的过滤条件，appliedFilters 用于存储实际应用的过滤条件
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<DiscoveryFilters>(defaultFilters);
  // 中文注释：items 用于存储当前页面的场景列表，page 表示当前页码，hasMore 表示是否有更多数据，loading 表示是否正在加载数据，loadingMore 表示是否正在加载更多数据，errorMessage 用于存储错误信息
  const [items, setItems] = useState<ScenarioListResponse["items"]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // 中文注释：initialLoadHandledRef 用于标记是否已经处理过初始加载，skipNextAppliedFiltersEffectRef 用于跳过下一次应用过滤器的副作用
  const initialLoadHandledRef = useRef(false);
  // 中文注释：skipNextAppliedFiltersEffectRef 用于跳过下一次应用过滤器的副作用，避免在初始加载时触发不必要的请求
  const skipNextAppliedFiltersEffectRef = useRef(false);

  function readDiscoveryCache() {
    if (typeof window === "undefined") {
      return null;
    }

    return parseDiscoveryCache(window.sessionStorage.getItem(DISCOVERY_CACHE_KEY));
  }

  function writeDiscoveryCache(cache: DiscoveryPageCache) {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(DISCOVERY_CACHE_KEY, serializeDiscoveryCache(cache));
  }

  // English: Load scenarios for a given page
  // replace ? Whether to replace the existing scenarios with the new ones
  async function loadScenarios(nextPage: number, replace = false) {
    // what is URLSearchParams? URLSearchParams is a built-in browser API for working with the query string of a URL
    const searchParams = new URLSearchParams({
      mode: "scenario",
      page: `${nextPage}`,
      pageSize: `${PAGE_SIZE}`,
    });

    if (appliedFilters.keyword.trim()) {
      searchParams.set("keyword", appliedFilters.keyword.trim());
    }

    if (appliedFilters.difficulty) {
      searchParams.set("difficulty", appliedFilters.difficulty);
    }

    if (appliedFilters.type) {
      searchParams.set("type", appliedFilters.type);
    }

    const response = await apiRequest<ScenarioListResponse>(
      `/scenarios?${searchParams.toString()}`
    );

    setItems((current) => (replace ? response.items : [...current, ...response.items]));
    setPage(response.page);
    setHasMore(response.hasMore);
  }

  useEffect(() => {
    async function loadInitialScenarios() {
      // 中文注释：尝试从缓存中读取数据，如果存在则使用缓存数据，否则发起请求加载初始场景
      const cached = readDiscoveryCache();

      // 中文注释：如果缓存存在，则使用缓存数据，并设置 skipNextAppliedFiltersEffectRef 为 true，避免触发应用过滤器的副作用
      if (cached) {
        // 中文注释：设置 skipNextAppliedFiltersEffectRef 为 true，避免触发应用过滤器的副作用
        skipNextAppliedFiltersEffectRef.current = true;
        // 中文注释：使用缓存数据更新状态，包括草稿过滤器、应用过滤器、场景列表、页码和是否有更多数据，并将 loading 设置为 false
        setDraftFilters(cached.draftFilters);
        setAppliedFilters(cached.appliedFilters);
        setItems(cached.items);
        setPage(cached.page);
        setHasMore(cached.hasMore);
        setLoading(false);

        // 中文注释：使用 requestAnimationFrame 确保在下一次浏览器重绘之前滚动到缓存的 scrollY 位置，避免页面闪烁
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: cached.scrollY, behavior: "auto" });
        });
        return;
      }

      // 中文注释：如果缓存不存在，则发起请求加载初始场景，并处理可能的错误
      try {
        setErrorMessage("");
        setLoading(true);
        await loadScenarios(1, true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load discovery topics."
        );
      } finally {
        setLoading(false);
      }
    }

    // Load initial scenarios on component mount
    // 为什么加 void？因为 loadInitialScenarios 是一个异步函数，直接调用它会返回一个 Promise，而 useEffect 不允许返回 Promise。使用 void 可以忽略返回值，确保 useEffect 的返回值是 undefined，从而避免潜在的警告或错误。
    void loadInitialScenarios();
  }, []);

  useEffect(() => {
    if (!initialLoadHandledRef.current) {
      initialLoadHandledRef.current = true;
      return;
    }

    if (skipNextAppliedFiltersEffectRef.current) {
      skipNextAppliedFiltersEffectRef.current = false;
      return;
    }

    async function refreshScenarios() {
      try {
        setErrorMessage("");
        setLoading(true);
        await loadScenarios(1, true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load discovery topics."
        );
      } finally {
        setLoading(false);
      }
    }

    void refreshScenarios();
  }, [appliedFilters]);

  useEffect(() => {
    if (loading || !initialLoadHandledRef.current) {
      return;
    }

    writeDiscoveryCache({
      draftFilters,
      appliedFilters,
      items,
      page,
      hasMore,
      scrollY: typeof window === "undefined" ? 0 : window.scrollY,
    });
  }, [appliedFilters, draftFilters, hasMore, items, loading, page]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      if (loading) {
        return;
      }

      writeDiscoveryCache({
        draftFilters,
        appliedFilters,
        items,
        page,
        hasMore,
        scrollY: window.scrollY,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [appliedFilters, draftFilters, hasMore, items, loading, page]);

  return (
    <main>
      <PageShell className="space-y-10 pb-16">
        <Card className="space-y-5 border-[var(--color-hairline-soft)] p-6 shadow-[var(--shadow-float)]">
          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
            <span className="text-sm font-medium">Search topics</span>
          </div>
          <form
            className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedFilters(draftFilters);
            }}
          >
            <label className="block">
              <input
                value={draftFilters.keyword}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    keyword: event.target.value,
                  }))
                }
                placeholder="Search by title or description"
                className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="block">
              <select
                value={draftFilters.difficulty}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    difficulty: event.target.value as DiscoveryFilters["difficulty"],
                  }))
                }
                className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              >
                <option value="">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="block">
              <select
                value={draftFilters.type}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    type: event.target.value as DiscoveryFilters["type"],
                  }))
                }
                className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)]"
              >
                <option value="">All types</option>
                <option value="daily">Daily</option>
                <option value="interview">Interview</option>
                <option value="travel">Travel</option>
                <option value="business">Business</option>
              </select>
            </label>

            <Button type="submit" className="mt-auto inline-flex items-center gap-2">
              <Search className="h-4 w-4" strokeWidth={1.8} />
              Search
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="mt-auto"
              onClick={() => {
                setDraftFilters(defaultFilters);
                setAppliedFilters(defaultFilters);
              }}
            >
              Reset
            </Button>
          </form>
        </Card>

        {loading ? (
          <Card className="p-6 text-sm text-[var(--color-body)]">Loading topics...</Card>
        ) : null}

        {!loading && errorMessage ? (
          <Card className="space-y-4 p-6 text-sm text-[#9f1239]">
            <p>{errorMessage}</p>
            <Button
              type="button"
              onClick={() => {
                setAppliedFilters((current) => ({ ...current }));
              }}
            >
              Retry
            </Button>
          </Card>
        ) : null}

        {!loading && !errorMessage && items.length === 0 ? (
          <Card className="p-6 text-sm text-[var(--color-body)]">
            No matching topics were found. Try broadening your filters.
          </Card>
        ) : null}

        {!loading && !errorMessage && items.length > 0 ? (
          <>
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {items.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  returnTo="/discovery"
                />
              ))}
            </section>

            <div className="flex justify-center">
              {hasMore ? (
                <Button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => {
                    setLoadingMore(true);
                    setErrorMessage("");

                    void loadScenarios(page + 1).then(
                      () => {
                        setLoadingMore(false);
                      },
                      (error) => {
                        setErrorMessage(
                          error instanceof Error
                            ? error.message
                            : "Failed to load more topics."
                        );
                        setLoadingMore(false);
                      }
                    );
                  }}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">
                  You have reached the end of the topic list.
                </p>
              )}
            </div>
          </>
        ) : null}
      </PageShell>
    </main>
  );
}
