import "reflect-metadata";
import { DataSource } from "typeorm";
import { databaseConfig } from "./database.config";

const config = databaseConfig();

export default new DataSource({
  ...config,
  // TypeORM CLI 目前不支持从 NestJS ConfigService 中加载配置，因此需要在这里重复一些配置项，或者直接导入整个配置对象。
  migrations: ["src/common/database/migrations/*.ts"],
});
