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
export class UserAccessGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id: string };
    }>();
    const token = readBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Missing user access token.");
    }

    const payload = this.tokenService.verifyAccessToken(token);

    if (payload.actorType !== "user") {
      throw new UnauthorizedException("Invalid user access token.");
    }

    request.user = {
      id: payload.sub,
    };

    return true;
  }
}
