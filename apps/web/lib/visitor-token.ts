const visitorTokenStorageKey = "lcai_visitor_token";

export function getVisitorToken() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(visitorTokenStorageKey);

  if (existing) {
    return existing;
  }

  const nextToken =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `visitor_${crypto.randomUUID()}`
      : `visitor_${Date.now()}`;

  window.localStorage.setItem(visitorTokenStorageKey, nextToken);
  return nextToken;
}
