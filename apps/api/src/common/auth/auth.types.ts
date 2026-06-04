import type { AdminRole, AuthActorType } from "@learn-chinese-ai/shared-types";

export interface AccessTokenPayload {
  sub: string;
  actorType: AuthActorType;
  role?: AdminRole;
  jti: string;
  iat: number;
  exp: number;
}
