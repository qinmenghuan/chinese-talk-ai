import { registerAs } from "@nestjs/config";
import { databaseEntities } from "./entities";

function asNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const databaseConfig = registerAs("database", () => ({
  type: "postgres" as const,
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: asNumber(process.env.POSTGRES_PORT, 5432),
  username: process.env.POSTGRES_USER ?? "postgres",
  password: process.env.POSTGRES_PASSWORD ?? "",
  database: process.env.POSTGRES_DB ?? "learn_chinese_ai",
  synchronize: process.env.DB_SYNCHRONIZE !== "false",
  logging: process.env.DB_LOGGING === "true",
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: [...databaseEntities],
}));
