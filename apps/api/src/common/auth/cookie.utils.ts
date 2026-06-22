export function parseCookies(cookieHeader?: string | null) {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const chunk of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = chunk.trim().split("=");

    if (!rawKey || rawValue.length === 0) {
      continue;
    }

    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
  }

  return cookies;
}

export function serializeCookie(input: {
  name: string;
  value: string;
  maxAgeSeconds: number;
  httpOnly?: boolean;
}) {
  const parts = [
    `${input.name}=${encodeURIComponent(input.value)}`,
    "Path=/",
    `Max-Age=${Math.max(0, Math.floor(input.maxAgeSeconds))}`,
    "SameSite=Lax",
  ];

  if (input.httpOnly !== false) {
    parts.push("HttpOnly");
  }

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}
