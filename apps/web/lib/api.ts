import type { ApiResponse } from "@learn-chinese-ai/shared-types";

const defaultApiBaseUrl = "http://localhost:3003/api";

export function getApiBaseUrl() {
  return defaultApiBaseUrl;
}

export async function apiRequest<T>(
  path: string,
  init?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}
