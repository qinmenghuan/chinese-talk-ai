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
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<DiscoveryFilters>(defaultFilters);
  const [items, setItems] = useState<ScenarioListResponse["items"]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const initialLoadHandledRef = useRef(false);
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

  async function loadScenarios(nextPage: number, replace = false) {
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
      const cached = readDiscoveryCache();

      if (cached) {
        skipNextAppliedFiltersEffectRef.current = true;
        setDraftFilters(cached.draftFilters);
        setAppliedFilters(cached.appliedFilters);
        setItems(cached.items);
        setPage(cached.page);
        setHasMore(cached.hasMore);
        setLoading(false);

        window.requestAnimationFrame(() => {
          window.scrollTo({ top: cached.scrollY, behavior: "auto" });
        });
        return;
      }

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
