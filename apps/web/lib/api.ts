import type { ApiResponse } from "@learn-chinese-ai/shared-types";
import { getStoredAccessToken } from "./auth-storage";

const defaultApiBaseUrl = "http://localhost:3003/api";

export function getApiBaseUrl() {
  return defaultApiBaseUrl;
}

export function getApiWebSocketUrl(path: string, searchParams?: Record<string, string>) {
  const apiBaseUrl = new URL(getApiBaseUrl());
  const url = new URL(path, apiBaseUrl.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  init?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const accessToken = getStoredAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload || payload.code !== 200) {
    throw new Error(
      payload?.message?.trim() || `API request failed with status ${response.status}.`
    );
  }

  return payload.data;
}
