import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConversationEntity, UserPreferenceEntity } from "../../common/database/entities";
import { VolcengineModule } from "../../common/volcengine/volcengine.module";
import { volcengineConfig } from "../../common/volcengine/volcengine.config";
import { AuthModule } from "../auth/auth.module";
import { ScenarioModule } from "../scenario/scenario.module";
import { RealtimeController } from "./realtime.controller";
import { RealtimeService } from "./realtime.service";
import { RealtimeWsBridge } from "./realtime-ws.bridge";

@Module({
  imports: [
    AuthModule,
    ConfigModule.forFeature(volcengineConfig),
    TypeOrmModule.forFeature([ConversationEntity, UserPreferenceEntity]),
    VolcengineModule,
    ScenarioModule,
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeWsBridge],
  exports: [RealtimeWsBridge],
})
export class RealtimeModule {}
