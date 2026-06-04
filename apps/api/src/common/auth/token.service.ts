import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomUUID } from "node:crypto";
import type { AccessTokenPayload } from "./auth.types";

function encodeBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

@Injectable()
export class TokenService {
  private readonly secret =
    process.env.AUTH_TOKEN_SECRET ?? "learn-chinese-ai-dev-secret";
  private readonly accessTokenTtlSeconds = Number(process.env.AUTH_ACCESS_TTL ?? 900);
  private readonly refreshTokenTtlSeconds = Number(
    process.env.AUTH_REFRESH_TTL ?? 60 * 60 * 24 * 30
  );
  private readonly realtimeTicketTtlSeconds = Number(
    process.env.AUTH_REALTIME_TICKET_TTL ?? 60
  );

  signAccessToken(payload: Omit<AccessTokenPayload, "iat" | "exp" | "jti">): {
    token: string;
    expiresInSeconds: number;
    payload: AccessTokenPayload;
  } {
    const issuedAt = Math.floor(Date.now() / 1000);
    const fullPayload: AccessTokenPayload = {
      ...payload,
      iat: issuedAt,
      exp: issuedAt + this.accessTokenTtlSeconds,
      jti: randomUUID(),
    };
    const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = encodeBase64Url(JSON.stringify(fullPayload));
    const signature = this.signSegment(`${header}.${body}`);

    return {
      token: `${header}.${body}.${signature}`,
      expiresInSeconds: this.accessTokenTtlSeconds,
      payload: fullPayload,
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const [header, body, signature] = token.split(".");

    if (!header || !body || !signature) {
      throw new UnauthorizedException("Invalid access token.");
    }

    const expectedSignature = this.signSegment(`${header}.${body}`);

    if (expectedSignature !== signature) {
      throw new UnauthorizedException("Access token signature mismatch.");
    }

    let payload: AccessTokenPayload;

    try {
      payload = JSON.parse(decodeBase64Url(body)) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedException("Access token payload is invalid.");
    }

    if (!payload.sub || !payload.actorType || payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException("Access token has expired.");
    }

    return payload;
  }

  createOpaqueToken() {
    return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  }

  getRefreshTokenTtlSeconds() {
    return this.refreshTokenTtlSeconds;
  }

  getRealtimeTicketTtlSeconds() {
    return this.realtimeTicketTtlSeconds;
  }

  hashOpaqueToken(token: string) {
    return createHmac("sha256", this.secret).update(token).digest("hex");
  }

  private signSegment(segment: string) {
    return createHmac("sha256", this.secret).update(segment).digest("base64url");
  }
}
