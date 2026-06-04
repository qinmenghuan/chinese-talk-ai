/* eslint-disable @typescript-eslint/consistent-type-imports */
import type { UpdateUserPreferenceRequest } from "@learn-chinese-ai/shared-types";
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { UserAccessGuard } from "../../common/auth/user-access.guard";
import { AuthService } from "./auth.service";

interface HttpRequestLike {
  headers: Record<string, string | undefined>;
  ip?: string;
}

interface RedirectResponseLike {
  redirect(url: string): void;
  setHeader(name: string, value: string): void;
  json(payload: unknown): void;
}

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("auth/google/start")
  startGoogleLogin(
    @Query("next") next: string | undefined,
    @Res() response: RedirectResponseLike
  ) {
    response.redirect(this.authService.buildGoogleAuthStartUrl(next));
  }

  @Get("auth/google/callback")
  async handleGoogleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("mock") mock: string | undefined,
    @Req() request: HttpRequestLike,
    @Res() response: RedirectResponseLike
  ) {
    const result = await this.authService.handleGoogleCallback({
      code,
      state,
      mock,
      context: {
        cookieHeader: request.headers.cookie,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      },
    });

    response.setHeader("Set-Cookie", result.setCookie);
    response.redirect(result.redirectUrl);
  }

  @Get("auth/session")
  async getUserSession(
    @Headers("authorization") authorization: string | undefined,
    @Req() request: HttpRequestLike
  ) {
    return createApiResponse(
      await this.authService.getUserSession({
        authorization,
        cookieHeader: request.headers.cookie,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      })
    );
  }

  @Post("auth/refresh")
  async refreshUserSession(
    @Headers("authorization") authorization: string | undefined,
    @Req() request: HttpRequestLike
  ) {
    return createApiResponse(
      await this.authService.getUserSession({
        authorization,
        cookieHeader: request.headers.cookie,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      })
    );
  }

  @Post("auth/logout")
  async logoutUser(
    @Req() request: HttpRequestLike,
    @Res() response: RedirectResponseLike
  ) {
    const result = await this.authService.logoutUser({
      cookieHeader: request.headers.cookie,
    });

    response.setHeader("Set-Cookie", result.clearCookie);
    response.json(createApiResponse({ success: true }));
  }

  @UseGuards(UserAccessGuard)
  @Get("me/profile")
  async getProfile(@CurrentUser() user: { id: string }) {
    return createApiResponse(await this.authService.getUserProfile(user.id));
  }

  @UseGuards(UserAccessGuard)
  @Put("me/profile")
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: UpdateUserPreferenceRequest
  ) {
    return createApiResponse(await this.authService.updateUserProfile(user.id, body));
  }
}
