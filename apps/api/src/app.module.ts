import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./common/database/database.module";
import { RedisModule } from "./common/redis/redis.module";
import { VolcengineModule } from "./common/volcengine/volcengine.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { HealthModule } from "./modules/health/health.module";
import { HistoryModule } from "./modules/history/history.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { ReportModule } from "./modules/report/report.module";
import { ScenarioModule } from "./modules/scenario/scenario.module";
import { SystemConfigModule } from "./modules/system-config/system-config.module";
import { UserModule } from "./modules/user/user.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../.env",
    }),
    DatabaseModule,
    RedisModule,
    VolcengineModule,
    AuthModule,
    UserModule,
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
