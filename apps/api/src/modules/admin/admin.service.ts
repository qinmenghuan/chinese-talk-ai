/* eslint-disable @typescript-eslint/consistent-type-imports */
import type {
  AdminUpdateUserRequest,
  AdminUserDetail,
  AdminUserListResponse,
  UpdateUserStatusRequest,
  UserPreference,
} from "@learn-chinese-ai/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ConversationEntity,
  UserEntity,
  UserPreferenceEntity,
} from "../../common/database/entities";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserPreferenceEntity)
    private readonly userPreferenceRepository: Repository<UserPreferenceEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>
  ) {}

  async getMetrics() {
    const [usersTotal, sessionsToday, disabledUsers] = await Promise.all([
      this.userRepository.count(),
      this.countSessionsToday(),
      this.userRepository.count({
        where: {
          status: "disabled",
        },
      }),
    ]);

    return {
      sessionsToday,
      averageScore: 84,
      realtimeFailureRate: 0.018,
      usersTotal,
      disabledUsers,
    };
  }

  async listUsers(input: {
    keyword?: string;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminUserListResponse> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize =
      input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, 50) : 20;
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    const createdFrom = this.parseDateStart(input.createdFrom);
    const createdTo = this.parseDateEnd(input.createdTo);

    if (input.keyword?.trim()) {
      const keyword = `%${input.keyword.trim().toLowerCase()}%`;
      queryBuilder.where(
        "LOWER(user.email) LIKE :keyword OR LOWER(user.display_name) LIKE :keyword",
        {
          keyword,
        }
      );
    }

    if (createdFrom) {
      queryBuilder.andWhere("user.created_at >= :createdFrom", {
        createdFrom: createdFrom.toISOString(),
      });
    }

    if (createdTo) {
      queryBuilder.andWhere("user.created_at <= :createdTo", {
        createdTo: createdTo.toISOString(),
      });
    }

    queryBuilder.orderBy("user.created_at", "DESC");
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [users, total] = await queryBuilder.getManyAndCount();
    const preferences = users.length
      ? await this.userPreferenceRepository.find({
          where: users.map((user) => ({ userId: user.id })),
        })
      : [];
    const preferenceMap = new Map(preferences.map((item) => [item.userId, item]));

    return {
      items: users.map((user) =>
        this.toAdminUserListItem(user, preferenceMap.get(user.id))
      ),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const user = await this.getUserOrThrow(userId);
    const preference = await this.userPreferenceRepository.findOne({
      where: { userId },
    });

    return {
      user: this.toAdminUserListItem(user, preference),
    };
  }

  async updateUserStatus(userId: string, input: UpdateUserStatusRequest) {
    const user = await this.getUserOrThrow(userId);
    user.status = input.status;
    await this.userRepository.save(user);
    return this.getUserDetail(userId);
  }

  async updateUserProfile(userId: string, input: AdminUpdateUserRequest) {
    const user = await this.getUserOrThrow(userId);

    if (input.displayName?.trim()) {
      user.displayName = input.displayName.trim();
      await this.userRepository.save(user);
    }

    await this.userPreferenceRepository.save({
      userId,
      proficiencyLevel: input.proficiencyLevel,
      learningGoal: input.learningGoal,
      preferredVoiceId: input.preferredVoiceId,
    });

    return this.getUserDetail(userId);
  }

  private async countSessionsToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    return this.conversationRepository
      .createQueryBuilder("conversation")
      .where("conversation.started_at >= :start", { start: start.toISOString() })
      .getCount();
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

  private getDefaultPreference(): UserPreference {
    return {
      proficiencyLevel: "beginner",
      learningGoal: "daily",
      preferredVoiceId: "friendly-female",
    };
  }

  private toAdminUserListItem(
    user: UserEntity,
    preference?: UserPreferenceEntity | null
  ) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      preference: preference
        ? {
            proficiencyLevel: preference.proficiencyLevel,
            learningGoal: preference.learningGoal,
            preferredVoiceId: preference.preferredVoiceId,
          }
        : this.getDefaultPreference(),
    };
  }

  private parseDateStart(value?: string) {
    if (!value?.trim()) {
      return null;
    }

    const date = new Date(`${value.trim()}T00:00:00.000Z`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseDateEnd(value?: string) {
    if (!value?.trim()) {
      return null;
    }

    const date = new Date(`${value.trim()}T23:59:59.999Z`);

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
