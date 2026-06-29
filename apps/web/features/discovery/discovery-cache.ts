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

// 中文注释：parseDiscoveryCache 函数用于解析存储在本地存储中的发现页面缓存数据，如果数据存在且格式正确，则返回解析后的对象，否则返回 null
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
