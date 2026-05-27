import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AnonymousSessionEntity,
  ConversationEntity,
} from "../../common/database/entities";
import { VolcengineModule } from "../../common/volcengine/volcengine.module";
import { ScenarioModule } from "../scenario/scenario.module";
import { RealtimeController } from "./realtime.controller";
import { RealtimeService } from "./realtime.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([AnonymousSessionEntity, ConversationEntity]),
    VolcengineModule,
    ScenarioModule,
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService],
})
export class RealtimeModule {}
