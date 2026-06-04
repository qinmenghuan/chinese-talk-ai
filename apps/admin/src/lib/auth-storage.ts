const adminAccessTokenStorageKey = "lcai_admin_access_token";

export function getStoredAdminAccessToken() {
  return window.localStorage.getItem(adminAccessTokenStorageKey) ?? "";
}

export function setStoredAdminAccessToken(token: string) {
  window.localStorage.setItem(adminAccessTokenStorageKey, token);
}

export function clearStoredAdminAccessToken() {
  window.localStorage.removeItem(adminAccessTokenStorageKey);
}
