/* eslint-disable @typescript-eslint/consistent-type-imports */
import type { AdminLoginRequest } from "@learn-chinese-ai/shared-types";
import { Body, Controller, Get, Headers, Post, Req, Res } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { AuthService } from "../auth/auth.service";

interface HttpRequestLike {
  headers: Record<string, string | undefined>;
  ip?: string;
}

interface JsonResponseLike {
  setHeader(name: string, value: string): void;
  json(payload: unknown): void;
}

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() body: AdminLoginRequest,
    @Req() request: HttpRequestLike,
    @Res() response: JsonResponseLike
  ) {
    const result = await this.authService.loginAdmin(body, {
      cookieHeader: request.headers.cookie,
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    response.setHeader("Set-Cookie", result.setCookie);
    response.json(
      createApiResponse({
        admin: result.admin,
        accessToken: result.accessToken,
        expiresInSeconds: result.expiresInSeconds,
      })
    );
  }

  @Get("session")
  async getSession(
    @Headers("authorization") authorization: string | undefined,
    @Req() request: HttpRequestLike
  ) {
    return createApiResponse(
      await this.authService.getAdminSession({
        authorization,
        cookieHeader: request.headers.cookie,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      })
    );
  }

  @Post("logout")
  async logout(@Req() request: HttpRequestLike, @Res() response: JsonResponseLike) {
    const result = await this.authService.logoutAdmin({
      cookieHeader: request.headers.cookie,
    });

    response.setHeader("Set-Cookie", result.clearCookie);
    response.json(createApiResponse({ success: true }));
  }
}
