import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./modules/admin/admin.module";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { HealthModule } from "./modules/health/health.module";
import { HistoryModule } from "./modules/history/history.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { ReportModule } from "./modules/report/report.module";
import { ScenarioModule } from "./modules/scenario/scenario.module";
import { SystemConfigModule } from "./modules/system-config/system-config.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../.env",
    }),
    HealthModule,
    RealtimeModule,
    ConversationModule,
    ReportModule,
    ScenarioModule,
    HistoryModule,
    AdminModule,
    SystemConfigModule,
  ],
})
export class AppModule {}
