/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  AdminLoginRequest,
  AdminSessionUser,
  AuthSessionUser,
  UpdateUserPreferenceRequest,
  UserPreference,
  UserProfile,
} from "@learn-chinese-ai/shared-types";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Repository } from "typeorm";
import {
  AdminUserEntity,
  AuthSessionEntity,
  UserEntity,
  UserIdentityEntity,
  UserPreferenceEntity,
} from "../../common/database/entities";
import { parseCookies, serializeCookie } from "../../common/auth/cookie.utils";
import { TokenService } from "../../common/auth/token.service";

interface RequestContext {
  authorization?: string;
  cookieHeader?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface GoogleProfile {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  providerSubject: string;
}

@Injectable()
export class AuthService {
  private readonly userRefreshCookieName = "lcai_user_refresh_token";
  private readonly adminRefreshCookieName = "lcai_admin_refresh_token";
  private readonly webBaseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3000";
  private readonly apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3003";
  private readonly googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
  private readonly googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  private readonly googleMockLoginEnabled =
    process.env.AUTH_MOCK_GOOGLE_LOGIN !== "false";

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserIdentityEntity)
    private readonly userIdentityRepository: Repository<UserIdentityEntity>,
    @InjectRepository(UserPreferenceEntity)
    private readonly userPreferenceRepository: Repository<UserPreferenceEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly adminUserRepository: Repository<AdminUserEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly authSessionRepository: Repository<AuthSessionEntity>,
    private readonly tokenService: TokenService
  ) {}

  buildGoogleAuthStartUrl(next?: string) {
    const state = this.encodeState({
      next: this.normalizeNextPath(next),
    });

    if (!this.googleClientId || !this.googleClientSecret) {
      if (!this.googleMockLoginEnabled) {
        throw new BadRequestException("Google OAuth is not configured.");
      }

      return `${this.apiBaseUrl}/api/auth/google/callback?mock=1&state=${encodeURIComponent(state)}`;
    }

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.googleClientId);
    url.searchParams.set("redirect_uri", `${this.apiBaseUrl}/api/auth/google/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", state);

    return url.toString();
  }

  async handleGoogleCallback(input: {
    code?: string;
    state?: string;
    mock?: string;
    context: RequestContext;
  }) {
    const state = this.decodeState(input.state);
    const next = this.normalizeNextPath(state.next);
    const profile =
      input.mock === "1" || !this.googleClientId || !this.googleClientSecret
        ? this.buildMockGoogleProfile()
        : await this.exchangeGoogleProfile(input.code);
    const user = await this.findOrCreateGoogleUser(profile);
    const session = await this.createAuthSession({
      actorType: "user",
      actorId: user.id,
      userAgent: input.context.userAgent,
      ipAddress: input.context.ipAddress,
    });

    return {
      redirectUrl: `${this.webBaseUrl}/login/callback?next=${encodeURIComponent(next)}`,
      setCookie: serializeCookie({
        name: this.userRefreshCookieName,
        value: session.refreshToken,
        maxAgeSeconds: session.refreshExpiresInSeconds,
      }),
    };
  }

  async getUserSession(context: RequestContext): Promise<AuthSessionUser> {
    const user = await this.resolveUserFromContext(context);

    return await this.buildUserSession(user);
  }

  async logoutUser(context: RequestContext) {
    const refreshToken = parseCookies(context.cookieHeader)[this.userRefreshCookieName];

    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken, "user");
    }

    return {
      clearCookie: serializeCookie({
        name: this.userRefreshCookieName,
        value: "",
        maxAgeSeconds: 0,
      }),
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.getUserOrThrow(userId);
    const preference = await this.getUserPreference(userId);

    return {
      user: this.toUserProfile(user),
      preference,
    };
  }

  async updateUserProfile(userId: string, input: UpdateUserPreferenceRequest) {
    const user = await this.getUserOrThrow(userId);

    if (typeof input.displayName === "string" && input.displayName.trim().length > 0) {
      user.displayName = input.displayName.trim();
      await this.userRepository.save(user);
    }

    await this.userPreferenceRepository.save({
      userId,
      proficiencyLevel: input.proficiencyLevel,
      learningGoal: input.learningGoal,
      preferredVoiceId: input.preferredVoiceId,
    });

    return this.getUserProfile(userId);
  }

  async loginAdmin(input: AdminLoginRequest, context: RequestContext) {
    await this.ensureSeedAdmin();
    const admin = await this.adminUserRepository.findOne({
      where: { username: input.username.trim() },
    });

    if (!admin || admin.status !== "active") {
      throw new UnauthorizedException("Admin credentials are invalid.");
    }

    const expectedHash = this.hashPassword(input.password);
    const actualBuffer = Buffer.from(admin.passwordHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException("Admin credentials are invalid.");
    }

    admin.lastLoginAt = new Date();
    await this.adminUserRepository.save(admin);

    const authSession = await this.createAuthSession({
      actorType: "admin",
      actorId: admin.id,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });
    const session = this.buildAdminSession(admin);

    return {
      ...session,
      setCookie: serializeCookie({
        name: this.adminRefreshCookieName,
        value: authSession.refreshToken,
        maxAgeSeconds: authSession.refreshExpiresInSeconds,
      }),
    };
  }

  async getAdminSession(context: RequestContext): Promise<AdminSessionUser> {
    await this.ensureSeedAdmin();
    const admin = await this.resolveAdminFromContext(context);

    return this.buildAdminSession(admin);
  }

  async logoutAdmin(context: RequestContext) {
    const refreshToken = parseCookies(context.cookieHeader)[this.adminRefreshCookieName];

    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken, "admin");
    }

    return {
      clearCookie: serializeCookie({
        name: this.adminRefreshCookieName,
        value: "",
        maxAgeSeconds: 0,
      }),
    };
  }

  async ensureSeedAdmin() {
    const username = process.env.ADMIN_DEFAULT_USERNAME ?? "admin";
    const password = process.env.ADMIN_DEFAULT_PASSWORD ?? "123456";
    const existing = await this.adminUserRepository.findOne({
      where: { username },
    });

    if (existing) {
      return existing;
    }

    return this.adminUserRepository.save({
      id: `admin_${randomUUID()}`,
      username,
      passwordHash: this.hashPassword(password),
      role: "super_admin",
      status: "active",
      lastLoginAt: null,
    });
  }

  private async resolveUserFromContext(context: RequestContext) {
    const bearerToken = this.readBearerToken(context.authorization);

    if (bearerToken) {
      const payload = this.tokenService.verifyAccessToken(bearerToken);

      if (payload.actorType !== "user") {
        throw new UnauthorizedException("Invalid user access token.");
      }

      return this.getActiveUserOrThrow(payload.sub);
    }

    const refreshToken = parseCookies(context.cookieHeader)[this.userRefreshCookieName];

    if (!refreshToken) {
      throw new UnauthorizedException("User session was not found.");
    }

    const authSession = await this.getValidRefreshSession(refreshToken, "user");
    return this.getActiveUserOrThrow(authSession.actorId);
  }

  private async resolveAdminFromContext(context: RequestContext) {
    const bearerToken = this.readBearerToken(context.authorization);

    if (bearerToken) {
      const payload = this.tokenService.verifyAccessToken(bearerToken);

      if (payload.actorType !== "admin") {
        throw new UnauthorizedException("Invalid admin access token.");
      }

      return this.getActiveAdminOrThrow(payload.sub);
    }

    const refreshToken = parseCookies(context.cookieHeader)[this.adminRefreshCookieName];

    if (!refreshToken) {
      throw new UnauthorizedException("Admin session was not found.");
    }

    const authSession = await this.getValidRefreshSession(refreshToken, "admin");
    return this.getActiveAdminOrThrow(authSession.actorId);
  }

  private async createAuthSession(input: {
    actorType: "user" | "admin";
    actorId: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const refreshToken = this.tokenService.createOpaqueToken();
    const refreshTokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const refreshExpiresInSeconds = this.tokenService.getRefreshTokenTtlSeconds();
    const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

    await this.authSessionRepository.save({
      id: `auth_${randomUUID()}`,
      actorType: input.actorType,
      actorId: input.actorId,
      refreshTokenHash,
      userAgent: input.userAgent?.slice(0, 512) ?? null,
      ipAddress: input.ipAddress?.slice(0, 120) ?? null,
      expiresAt,
      revokedAt: null,
    });

    return {
      refreshToken,
      refreshExpiresInSeconds,
    };
  }

  private async revokeRefreshToken(refreshToken: string, actorType: "user" | "admin") {
    const refreshTokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const authSession = await this.authSessionRepository.findOne({
      where: {
        refreshTokenHash,
        actorType,
      },
    });

    if (!authSession || authSession.revokedAt) {
      return;
    }

    authSession.revokedAt = new Date();
    await this.authSessionRepository.save(authSession);
  }

  private async getValidRefreshSession(
    refreshToken: string,
    actorType: "user" | "admin"
  ) {
    const refreshTokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const authSession = await this.authSessionRepository.findOne({
      where: {
        refreshTokenHash,
        actorType,
      },
    });

    if (
      !authSession ||
      authSession.revokedAt ||
      authSession.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException("Refresh session is invalid.");
    }

    return authSession;
  }

  private async getUserPreference(userId: string): Promise<UserPreference> {
    const preference = await this.userPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preference) {
      return {
        proficiencyLevel: "beginner",
        learningGoal: "daily",
        preferredVoiceId: "friendly-female",
      };
    }

    return {
      proficiencyLevel: preference.proficiencyLevel,
      learningGoal: preference.learningGoal,
      preferredVoiceId: preference.preferredVoiceId,
    };
  }

  private async buildUserSession(user: UserEntity): Promise<AuthSessionUser> {
    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      actorType: "user",
    });

    return {
      user: this.toUserProfile(user),
      preference: await this.getUserPreference(user.id),
      accessToken: accessToken.token,
      expiresInSeconds: accessToken.expiresInSeconds,
    };
  }

  private buildAdminSession(admin: AdminUserEntity): AdminSessionUser {
    const accessToken = this.tokenService.signAccessToken({
      sub: admin.id,
      actorType: "admin",
      role: admin.role,
    });

    return {
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        status: admin.status,
      },
      accessToken: accessToken.token,
      expiresInSeconds: accessToken.expiresInSeconds,
    };
  }

  private async findOrCreateGoogleUser(profile: GoogleProfile) {
    const existingIdentity = await this.userIdentityRepository.findOne({
      where: {
        provider: "google",
        providerSubject: profile.providerSubject,
      },
      relations: {
        user: true,
      },
    });

    if (existingIdentity?.user) {
      existingIdentity.user.displayName = profile.displayName;
      existingIdentity.user.avatarUrl = profile.avatarUrl;
      existingIdentity.user.lastLoginAt = new Date();
      await this.userRepository.save(existingIdentity.user);
      return existingIdentity.user;
    }

    let user = await this.userRepository.findOne({
      where: { email: profile.email.toLowerCase() },
    });

    if (!user) {
      user = await this.userRepository.save({
        id: `user_${randomUUID()}`,
        email: profile.email.toLowerCase(),
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        status: "active",
        lastLoginAt: new Date(),
      });
      await this.userPreferenceRepository.save({
        userId: user.id,
        proficiencyLevel: "beginner",
        learningGoal: "daily",
        preferredVoiceId: "friendly-female",
      });
    } else {
      user.displayName = profile.displayName;
      user.avatarUrl = profile.avatarUrl;
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);
    }

    await this.userIdentityRepository.save({
      id: `uid_${randomUUID()}`,
      userId: user.id,
      provider: "google",
      providerSubject: profile.providerSubject,
      providerEmail: profile.email.toLowerCase(),
    });

    return user;
  }

  private async exchangeGoogleProfile(code?: string): Promise<GoogleProfile> {
    if (!code) {
      throw new BadRequestException("Google authorization code is missing.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        redirect_uri: `${this.apiBaseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new BadRequestException("Failed to exchange Google auth code.");
    }

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      id_token?: string;
    };

    const accessToken = tokenPayload.access_token;

    if (!accessToken) {
      throw new BadRequestException("Google access token is missing.");
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!profileResponse.ok) {
      throw new BadRequestException("Failed to load Google user info.");
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!profile.sub || !profile.email) {
      throw new BadRequestException("Google user info is incomplete.");
    }

    return {
      providerSubject: profile.sub,
      email: profile.email,
      displayName: profile.name?.trim() || profile.email.split("@")[0] || "Learner",
      avatarUrl: profile.picture ?? null,
    };
  }

  private buildMockGoogleProfile(): GoogleProfile {
    const email = process.env.AUTH_MOCK_GOOGLE_EMAIL ?? "demo.user@learn-chinese.ai";

    return {
      email,
      displayName: process.env.AUTH_MOCK_GOOGLE_NAME ?? "Demo Learner",
      avatarUrl: null,
      providerSubject: `mock-google-${email.toLowerCase()}`,
    };
  }

  private encodeState(input: { next: string }) {
    return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
  }

  private decodeState(value?: string) {
    if (!value) {
      return { next: "/" };
    }

    try {
      return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
        next?: string;
      };
    } catch {
      return { next: "/" };
    }
  }

  private normalizeNextPath(next?: string) {
    if (!next || !next.startsWith("/")) {
      return "/";
    }

    return next;
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User was not found.");
    }

    return user;
  }

  private async getActiveUserOrThrow(userId: string) {
    const user = await this.getUserOrThrow(userId);

    if (user.status !== "active") {
      throw new UnauthorizedException("User account is disabled.");
    }

    return user;
  }

  private async getActiveAdminOrThrow(adminId: string) {
    const admin = await this.adminUserRepository.findOne({
      where: { id: adminId },
    });

    if (!admin || admin.status !== "active") {
      throw new UnauthorizedException("Admin account is disabled.");
    }

    return admin;
  }

  private toUserProfile(user: UserEntity): UserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
    };
  }

  private readBearerToken(headerValue?: string) {
    if (!headerValue?.startsWith("Bearer ")) {
      return null;
    }

    return headerValue.slice("Bearer ".length).trim();
  }

  private hashPassword(value: string) {
    return createHash("sha256")
      .update(`${process.env.AUTH_PASSWORD_SALT ?? "learn-chinese-ai"}:${value}`)
      .digest("hex");
  }
}
