import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";
import { AuthModule } from "../auth/auth.module";
import { AdminReportController } from "./admin-report.controller";
import { ReportController } from "./report.controller";
import { ReportService } from "./report.service";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([ConversationEntity, MessageEntity, ReportEntity]),
  ],
  controllers: [ReportController, AdminReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
