import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";

export interface RequestUser {
  id: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();

    return request.user ?? { id: "" };
  }
);
