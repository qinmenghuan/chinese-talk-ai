import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AnonymousSessionEntity,
  ConversationEntity,
} from "../../common/database/entities";
import { VolcengineModule } from "../../common/volcengine/volcengine.module";
import { volcengineConfig } from "../../common/volcengine/volcengine.config";
import { ScenarioModule } from "../scenario/scenario.module";
import { RealtimeController } from "./realtime.controller";
import { RealtimeService } from "./realtime.service";
import { RealtimeWsBridge } from "./realtime-ws.bridge";

@Module({
  imports: [
    ConfigModule.forFeature(volcengineConfig),
    TypeOrmModule.forFeature([AnonymousSessionEntity, ConversationEntity]),
    VolcengineModule,
    ScenarioModule,
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeWsBridge],
  exports: [RealtimeWsBridge],
})
export class RealtimeModule {}
