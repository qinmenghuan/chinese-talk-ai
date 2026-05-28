import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DoubaoRealtimeService } from "./doubao-realtime.service";
import { DoubaoPromptBuilder } from "./doubao-prompt.builder";
import { RtcAiVoiceService } from "./rtc-ai-voice.service";
import { RtcTokenService } from "./rtc-token.service";
import { volcengineConfig } from "./volcengine.config";

@Module({
  imports: [ConfigModule.forFeature(volcengineConfig)],
  providers: [
    DoubaoPromptBuilder,
    DoubaoRealtimeService,
    RtcTokenService,
    RtcAiVoiceService,
  ],
  exports: [
    DoubaoPromptBuilder,
    DoubaoRealtimeService,
    RtcTokenService,
    RtcAiVoiceService,
  ],
})
export class VolcengineModule {}
