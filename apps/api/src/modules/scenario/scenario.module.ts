import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  PracticeScenarioEntity,
  ScenarioRoleEntity,
} from "../../common/database/entities";
import { AuthModule } from "../auth/auth.module";
import { AdminScenarioController } from "./admin-scenario.controller";
import { ScenarioController } from "./scenario.controller";
import { ScenarioService } from "./scenario.service";
import { ScenarioSeedService } from "./scenario.seed.service";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([PracticeScenarioEntity, ScenarioRoleEntity]),
  ],
  controllers: [ScenarioController, AdminScenarioController],
  providers: [ScenarioService, ScenarioSeedService],
  exports: [ScenarioService],
})
export class ScenarioModule {}
