import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { AdminRole } from "@learn-chinese-ai/shared-types";

export interface RequestAdmin {
  id: string;
  role: AdminRole;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestAdmin => {
    const request = context.switchToHttp().getRequest<{ admin?: RequestAdmin }>();

    return request.admin ?? { id: "", role: "super_admin" };
  }
);
