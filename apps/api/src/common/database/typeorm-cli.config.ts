import "reflect-metadata";
import { DataSource } from "typeorm";
import { databaseConfig } from "./database.config";

const config = databaseConfig();

export default new DataSource({
  ...config,
});
