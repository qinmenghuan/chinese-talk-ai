import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";
import { ReportController } from "./report.controller";
import { ReportService } from "./report.service";

@Module({
  imports: [TypeOrmModule.forFeature([ConversationEntity, MessageEntity, ReportEntity])],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
