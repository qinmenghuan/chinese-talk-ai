const webAccessTokenStorageKey = "lcai_web_access_token";

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(webAccessTokenStorageKey) ?? "";
}

export function setStoredAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(webAccessTokenStorageKey, token);
}

export function clearStoredAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(webAccessTokenStorageKey);
}
