import { getStoredAdminAccessToken } from "./auth-storage";

const apiBaseUrl = "http://localhost:3003/api";

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

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data: T;
  };

  return payload.data;
}
