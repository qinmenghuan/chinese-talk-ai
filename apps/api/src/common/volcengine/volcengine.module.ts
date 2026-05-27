import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DoubaoPromptBuilder } from "./doubao-prompt.builder";
import { RtcAiVoiceService } from "./rtc-ai-voice.service";
import { RtcTokenService } from "./rtc-token.service";
import { volcengineConfig } from "./volcengine.config";

@Module({
  imports: [ConfigModule.forFeature(volcengineConfig)],
  providers: [DoubaoPromptBuilder, RtcTokenService, RtcAiVoiceService],
  exports: [RtcTokenService, RtcAiVoiceService],
})
export class VolcengineModule {}
