/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { TokenService } from "./token.service";

function readBearerToken(headerValue?: string) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim();
}

@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      admin?: { id: string; role: "super_admin" };
    }>();
    const token = readBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Missing admin access token.");
    }

    const payload = this.tokenService.verifyAccessToken(token);

    if (payload.actorType !== "admin") {
      throw new UnauthorizedException("Invalid admin access token.");
    }

    request.admin = {
      id: payload.sub,
      role: payload.role ?? "super_admin",
    };

    return true;
  }
}
