export function getCurrentPath(fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return `${window.location.pathname}${window.location.search}`;
}
