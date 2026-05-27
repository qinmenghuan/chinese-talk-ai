import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AnonymousSessionEntity,
  ConversationEntity,
  MessageEntity,
  ReportEntity,
} from "../../common/database/entities";
import { HistoryController } from "./history.controller";
import { HistoryService } from "./history.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnonymousSessionEntity,
      ConversationEntity,
      MessageEntity,
      ReportEntity,
    ]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
