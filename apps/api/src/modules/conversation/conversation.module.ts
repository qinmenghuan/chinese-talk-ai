import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";
import { AuthModule } from "../auth/auth.module";
import { ReportModule } from "../report/report.module";
import { ScenarioModule } from "../scenario/scenario.module";
import { ConversationController } from "./conversation.controller";
import { ConversationService } from "./conversation.service";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([ConversationEntity, MessageEntity, ReportEntity]),
    ReportModule,
    ScenarioModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
