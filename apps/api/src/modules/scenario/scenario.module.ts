import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  PracticeScenarioEntity,
  ScenarioRoleEntity,
} from "../../common/database/entities";
import { ScenarioController } from "./scenario.controller";
import { ScenarioService } from "./scenario.service";
import { ScenarioSeedService } from "./scenario.seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([PracticeScenarioEntity, ScenarioRoleEntity])],
  controllers: [ScenarioController],
  providers: [ScenarioService, ScenarioSeedService],
  exports: [ScenarioService],
})
export class ScenarioModule {}
