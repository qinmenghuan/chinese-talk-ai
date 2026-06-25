import type { ApiResponse } from "@learn-chinese-ai/shared-types";
import { getStoredAdminAccessToken } from "./auth-storage";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiRequest<T>(
  path: string,
  init?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const accessToken = getStoredAdminAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload || payload.code !== 200) {
    throw new Error(
      payload?.message?.trim() || `API request failed with status ${response.status}.`
    );
  }

  return payload.data;
}
