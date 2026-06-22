import type {
  PracticeDifficulty,
  ScenarioListResponse,
  ScenarioType,
} from "@learn-chinese-ai/shared-types";

export const DISCOVERY_CACHE_KEY = "discovery-page-cache";

export interface DiscoveryFilters {
  keyword: string;
  difficulty: "" | PracticeDifficulty;
  type: "" | ScenarioType;
}

export interface DiscoveryPageCache {
  draftFilters: DiscoveryFilters;
  appliedFilters: DiscoveryFilters;
  items: ScenarioListResponse["items"];
  page: number;
  hasMore: boolean;
  scrollY: number;
}

export const defaultFilters: DiscoveryFilters = {
  keyword: "",
  difficulty: "",
  type: "",
};

export function parseDiscoveryCache(raw: string | null): DiscoveryPageCache | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DiscoveryPageCache;
  } catch {
    return null;
  }
}

export function serializeDiscoveryCache(cache: DiscoveryPageCache) {
  return JSON.stringify(cache);
}
