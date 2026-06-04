import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ConversationEntity,
  UserEntity,
  UserPreferenceEntity,
} from "../../common/database/entities";
import { AuthModule } from "../auth/auth.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminUserController } from "./admin-user.controller";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([UserEntity, UserPreferenceEntity, ConversationEntity]),
  ],
  controllers: [AdminController, AdminAuthController, AdminUserController],
  providers: [AdminService],
})
export class AdminModule {}
