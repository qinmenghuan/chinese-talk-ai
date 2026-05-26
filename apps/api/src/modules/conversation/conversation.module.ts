import { Module } from "@nestjs/common";
import { ReportModule } from "../report/report.module";
import { ScenarioModule } from "../scenario/scenario.module";
import { ConversationController } from "./conversation.controller";
import { ConversationService } from "./conversation.service";

@Module({
  imports: [ReportModule, ScenarioModule],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
