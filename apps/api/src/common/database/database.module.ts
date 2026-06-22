import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseEntities } from "./entities";

function asNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("POSTGRES_HOST", "localhost"),
        port: asNumber(configService.get<string>("POSTGRES_PORT"), 5432),
        username: configService.get<string>("POSTGRES_USER", "postgres"),
        password: configService.get<string>("POSTGRES_PASSWORD", ""),
        database: configService.get<string>("POSTGRES_DB", "learn_chinese_ai"),
        synchronize: configService.get<string>("DB_SYNCHRONIZE") !== "false",
        logging: configService.get<string>("DB_LOGGING") === "true",
        ssl:
          configService.get<string>("DATABASE_SSL") === "true"
            ? { rejectUnauthorized: false }
            : false,
        entities: [...databaseEntities],
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
