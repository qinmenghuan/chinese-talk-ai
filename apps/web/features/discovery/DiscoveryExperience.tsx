"use client";

import type {
  PracticeDifficulty,
  ScenarioListResponse,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";
import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { ScenarioCard } from "../../components/ScenarioCard";
import { apiRequest } from "../../lib/api";

const PAGE_SIZE = 20;

interface SearchFilters {
  keyword: string;
  difficulty: "" | PracticeDifficulty;
  type: "" | ScenarioType;
}

const defaultFilters: SearchFilters = {
  keyword: "",
  difficulty: "",
  type: "",
};

export function DiscoveryExperience() {
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(defaultFilters);
  const [items, setItems] = useState<ScenarioListResponse["items"]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
  }, [appliedFilters]);

  return (
    <main>
      <PageShell className="space-y-10 pb-16">
        <SectionHeading
          eyebrow="Discovery"
          title="Find the right conversation topic"
          description="Search by keyword, difficulty, and scenario type, then jump directly into practice."
        />

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
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Keyword
              </span>
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
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Difficulty
              </span>
              <select
                value={draftFilters.difficulty}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    difficulty: event.target.value as SearchFilters["difficulty"],
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
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Type
              </span>
              <select
                value={draftFilters.type}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    type: event.target.value as SearchFilters["type"],
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
                <ScenarioCard key={scenario.id} scenario={scenario} />
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
