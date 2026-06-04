import { Module } from "@nestjs/common";
import { AdminAccessGuard } from "../../common/auth/admin-access.guard";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenService } from "../../common/auth/token.service";
import { UserAccessGuard } from "../../common/auth/user-access.guard";
import {
  AdminUserEntity,
  AuthSessionEntity,
  UserEntity,
  UserIdentityEntity,
  UserPreferenceEntity,
} from "../../common/database/entities";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserIdentityEntity,
      UserPreferenceEntity,
      AdminUserEntity,
      AuthSessionEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, UserAccessGuard, AdminAccessGuard],
  exports: [AuthService, TokenService, UserAccessGuard, AdminAccessGuard],
})
export class AuthModule {}
