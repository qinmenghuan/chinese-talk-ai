import { Module } from "@nestjs/common";
import { ScenarioModule } from "../scenario/scenario.module";
import { RealtimeController } from "./realtime.controller";
import { RealtimeService } from "./realtime.service";

@Module({
  imports: [ScenarioModule],
  controllers: [RealtimeController],
  providers: [RealtimeService],
})
export class RealtimeModule {}
