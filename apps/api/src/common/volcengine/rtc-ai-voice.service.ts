import type { PracticeScenario, ScenarioRole } from "@learn-chinese-ai/shared-types";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Service } from "@volcengine/openapi";
import { randomUUID } from "node:crypto";
import type { DoubaoPromptBuilder } from "./doubao-prompt.builder";
import { volcengineConfig } from "./volcengine.config";

interface StartVoiceChatResponse {
  TaskId?: string;
  SessionId?: string;
}

interface VoiceChatStartupResult {
  taskId: string;
  providerSessionId: string | null;
  status: "starting" | "ready" | "failed";
  errorMessage?: string;
}

@Injectable()
export class RtcAiVoiceService {
  private readonly logger = new Logger(RtcAiVoiceService.name);
  private readonly service: Service;
  private readonly startVoiceChatApi: (
    payload: Record<string, unknown>
  ) => Promise<{ Result?: StartVoiceChatResponse }>;

  constructor(
    @Inject(volcengineConfig.KEY)
    private readonly config: ConfigType<typeof volcengineConfig>,
    private readonly promptBuilder: DoubaoPromptBuilder
  ) {
    this.service = new Service({
      host: config.openApiHost,
      serviceName: "rtc",
      defaultVersion: config.openApiVersion,
      region: "cn-north-1",
    });
    this.service.setAccessKeyId(config.openApiAccessKey);
    this.service.setSecretKey(config.openApiSecretKey);
    this.startVoiceChatApi = this.service.createJSONAPI("StartVoiceChat", {
      method: "POST",
      Version: config.openApiVersion,
      contentType: "json",
    }) as typeof this.startVoiceChatApi;
  }

  async startVoiceChat(input: {
    roomId: string;
    learnerUserId: string;
    botUserId: string;
    scenario: PracticeScenario;
    selectedRole: ScenarioRole;
  }): Promise<VoiceChatStartupResult> {
    const taskId = `task_${randomUUID()}`;
    const systemPrompt = this.promptBuilder.build({
      scenario: input.scenario,
      selectedRole: input.selectedRole,
    });

    try {
      this.assertVoiceChatConfig();
      this.logger.log(
        `StartVoiceChat request: version=${this.config.openApiVersion} room=${input.roomId} user=${input.learnerUserId} bot=${input.botUserId} asrApp=${this.config.speechAsrAppId} ttsApp=${this.config.speechTtsAppId}`
      );

      const response = await this.startVoiceChatApi(
        this.buildStartVoiceChatPayload({
          taskId,
          systemPrompt,
          input,
        })
      );

      this.logger.log(
        `StartVoiceChat ready: room=${input.roomId} task=${response.Result?.TaskId ?? taskId}`
      );

      return {
        taskId: response.Result?.TaskId ?? taskId,
        providerSessionId: response.Result?.SessionId ?? null,
        status: "ready" as const,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`StartVoiceChat failed: ${errorMessage}`);

      return {
        taskId,
        providerSessionId: null,
        status: "failed" as const,
        errorMessage,
      };
    }
  }

  private assertVoiceChatConfig() {
    const missing: string[] = [];

    if (!this.config.speechAsrAppId) {
      missing.push("VOLCENGINE_SPEECH_ASR_APP_ID");
    }

    if (!this.config.speechAsrAccessToken) {
      missing.push("VOLCENGINE_SPEECH_ASR_ACCESS_TOKEN");
    }

    if (!this.config.speechAsrApiResourceId) {
      missing.push("VOLCENGINE_SPEECH_ASR_API_RESOURCE_ID");
    }

    if (!this.config.speechTtsAppId) {
      missing.push("VOLCENGINE_SPEECH_TTS_APP_ID");
    }

    if (!this.config.speechTtsAccessToken) {
      missing.push("VOLCENGINE_SPEECH_TTS_ACCESS_TOKEN");
    }

    if (missing.length > 0) {
      throw new Error(
        `RTC AI voice chat is missing required Volcengine speech config: ${missing.join(", ")}`
      );
    }
  }

  private buildStartVoiceChatPayload(input: {
    taskId: string;
    systemPrompt: string;
    input: {
      roomId: string;
      learnerUserId: string;
      botUserId: string;
      scenario: PracticeScenario;
      selectedRole: ScenarioRole;
    };
  }) {
    const sharedConfig = {
      InterruptMode: 0,
      ASRConfig: {
        Provider: "volcano",
        ProviderParams: {
          Mode: "bigmodel",
          AppId: this.config.speechAsrAppId,
          AccessToken: this.config.speechAsrAccessToken,
          Cluster: this.config.speechAsrCluster,
          ApiResourceId: this.config.speechAsrApiResourceId,
          StreamMode: this.config.speechAsrStreamMode,
        },
      },
      TTSConfig: {
        Provider: "volcano_bidirection",
        ProviderParams: {
          app: {
            appid: this.config.speechTtsAppId,
            token: this.config.speechTtsAccessToken,
            cluster: this.config.speechTtsCluster,
          },
          audio: {
            voice_type: this.config.ttsVoiceType,
            encoding: "pcm",
            speed_ratio: 1,
            volume_ratio: 1,
            pitch_ratio: 1,
          },
          ...(this.config.speechTtsResourceId
            ? {
                ResourceId: this.config.speechTtsResourceId,
              }
            : {}),
        },
      },
      SubtitleConfig: {
        DisableRTSSubtitle: false,
        SubtitleMode: 0,
      },
      LLMConfig: {
        Mode: "ArkV3",
        EndPointId: this.config.arkEndpointId,
        SystemMessages: [input.systemPrompt],
      },
    };

    if (this.config.openApiVersion === "2024-06-01") {
      return {
        AppId: this.config.rtcAppId,
        RoomId: input.input.roomId,
        UserId: input.input.learnerUserId,
        Config: {
          ...sharedConfig,
          BotName: input.input.botUserId,
          LLMConfig: {
            ...sharedConfig.LLMConfig,
            WelcomeSpeech: input.input.scenario.openingLine,
          },
        },
      };
    }

    return {
      AppId: this.config.rtcAppId,
      RoomId: input.input.roomId,
      TaskId: input.taskId,
      AgentConfig: {
        UserId: input.input.botUserId,
        TargetUserId: [input.input.learnerUserId],
        WelcomeSpeech: input.input.scenario.openingLine,
        EnableConversationStateCallback: false,
      },
      Config: sharedConfig,
    };
  }
}
