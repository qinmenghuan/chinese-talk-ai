import { Global, Module } from "@nestjs/common";
import { PracticeStoreService } from "./practice-store.service";

@Global()
@Module({
  providers: [PracticeStoreService],
  exports: [PracticeStoreService],
})
export class RuntimeModule {}
