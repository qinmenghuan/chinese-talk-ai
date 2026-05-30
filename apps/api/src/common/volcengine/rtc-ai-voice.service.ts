import type { PracticeScenario, ScenarioRole } from "@learn-chinese-ai/shared-types";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Service } from "@volcengine/openapi";
import { randomUUID } from "node:crypto";
import { DoubaoPromptBuilder } from "./doubao-prompt.builder";
import { volcengineConfig } from "./volcengine.config";
import { resolveScenarioOpeningLine } from "../scenario/resolve-scenario-opening-line";

type StartVoiceChatResult = "ok" | { TaskId?: string; SessionId?: string } | null;

interface StartVoiceChatResponseMetadataError {
  Code?: string;
  CodeN?: number;
  Message?: string;
  MessageCn?: string;
}

interface StartVoiceChatResponseEnvelope {
  Result?: StartVoiceChatResult;
  ResponseMetadata?: {
    RequestId?: string;
    Error?: StartVoiceChatResponseMetadataError;
  };
}

interface VoiceChatStartupResult {
  taskId: string;
  providerSessionId: string | null;
  status: "starting" | "ready" | "failed";
  errorMessage?: string;
}

const RTC_AI_LEGACY_OPENAPI_VERSION = "2024-06-01";
const PAYLOAD_VARIANT =
  "legacy-hybrid-agent-config-with-task-id-flat-tts-provider-tts-key-aliases-and-llm-endpoint-aliases";

@Injectable()
export class RtcAiVoiceService {
  private readonly logger = new Logger(RtcAiVoiceService.name);
  private readonly service: Service;
  private readonly startVoiceChatApi: (
    payload: Record<string, unknown>
  ) => Promise<StartVoiceChatResponseEnvelope>;

  constructor(
    @Inject(volcengineConfig.KEY)
    private readonly config: ConfigType<typeof volcengineConfig>,
    @Inject(DoubaoPromptBuilder)
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
      const payload = this.buildStartVoiceChatPayload({
        taskId,
        systemPrompt,
        input,
      });

      this.logger.log(
        `StartVoiceChat request: version=${this.config.openApiVersion} variant=${PAYLOAD_VARIANT} room=${input.roomId} learner=${input.learnerUserId} bot=${input.botUserId} asrApp=${this.config.speechAsrAppId} ttsApp=${this.config.speechTtsAppId} llm=${this.summarizeLlmConfig(payload)} tts=${this.summarizeTtsConfig(payload)}`
      );

      const response = await this.startVoiceChatApi(payload);
      this.assertStartVoiceChatSucceeded(response, input.roomId);

      this.logger.log(
        `StartVoiceChat ready: version=${this.config.openApiVersion} variant=${PAYLOAD_VARIANT} room=${input.roomId} task=${this.readTaskId(response.Result) ?? taskId} session=${this.readSessionId(response.Result) ?? "n/a"} result=${typeof response.Result === "string" ? response.Result : "object"} requestId=${response.ResponseMetadata?.RequestId ?? "n/a"}`
      );

      return {
        taskId: this.readTaskId(response.Result) ?? taskId,
        providerSessionId: this.readSessionId(response.Result),
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

    if (!this.config.arkEndpointId) {
      missing.push("VOLCENGINE_ARK_ENDPOINT_ID");
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
    const openingLine = resolveScenarioOpeningLine(
      input.input.scenario,
      input.input.selectedRole.id
    );

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
        Provider: "volcano",
        ProviderParams: {
          AppId: this.config.speechTtsAppId,
          appid: this.config.speechTtsAppId,
          AccessToken: this.config.speechTtsAccessToken,
          token: this.config.speechTtsAccessToken,
          Cluster: this.config.speechTtsCluster,
          cluster: this.config.speechTtsCluster,
          VoiceType: this.config.ttsVoiceType,
          voice_type: this.config.ttsVoiceType,
          Encoding: "pcm",
          encoding: "pcm",
          SpeedRatio: 1,
          speed_ratio: 1,
          VolumeRatio: 1,
          volume_ratio: 1,
          PitchRatio: 1,
          pitch_ratio: 1,
          ...(this.config.speechTtsResourceId
            ? {
                ResourceId: this.config.speechTtsResourceId,
                resource_id: this.config.speechTtsResourceId,
              }
            : {}),
        },
      },
      SubtitleConfig: {
        DisableRTSSubtitle: false,
        SubtitleMode: 0,
      },
      BotName: input.input.botUserId,
      LLMConfig: {
        Mode: "ArkV3",
        EndPointId: this.config.arkEndpointId,
        EndpointId: this.config.arkEndpointId,
        endpoint_id: this.config.arkEndpointId,
        SystemMessages: [input.systemPrompt],
        WelcomeSpeech: openingLine,
      },
    };

    if (this.config.openApiVersion === RTC_AI_LEGACY_OPENAPI_VERSION) {
      return {
        AppId: this.config.rtcAppId,
        RoomId: input.input.roomId,
        TaskId: input.taskId,
        UserId: input.input.learnerUserId,
        AgentConfig: {
          UserId: input.input.botUserId,
          TargetUserId: [input.input.learnerUserId],
          WelcomeSpeech: openingLine,
          EnableConversationStateCallback: false,
        },
        Config: sharedConfig,
      };
    }

    return {
      AppId: this.config.rtcAppId,
      RoomId: input.input.roomId,
      TaskId: input.taskId,
      UserId: input.input.learnerUserId,
      AgentConfig: {
        UserId: input.input.botUserId,
        TargetUserId: [input.input.learnerUserId],
        WelcomeSpeech: openingLine,
        EnableConversationStateCallback: false,
      },
      Config: sharedConfig,
    };
  }

  private readTaskId(result: StartVoiceChatResult | undefined) {
    return typeof result === "object" && result ? (result.TaskId ?? null) : null;
  }

  private readSessionId(result: StartVoiceChatResult | undefined) {
    return typeof result === "object" && result ? (result.SessionId ?? null) : null;
  }

  private assertStartVoiceChatSucceeded(
    response: StartVoiceChatResponseEnvelope,
    roomId: string
  ) {
    const openApiError = response.ResponseMetadata?.Error;

    if (!openApiError) {
      return;
    }

    const errorCode = openApiError.Code ?? String(openApiError.CodeN ?? "unknown_error");
    const errorMessage =
      openApiError.MessageCn ?? openApiError.Message ?? "unknown StartVoiceChat error";
    const requestId = response.ResponseMetadata?.RequestId ?? "n/a";

    this.logger.error(
      `StartVoiceChat rejected: version=${this.config.openApiVersion} variant=${PAYLOAD_VARIANT} room=${roomId} requestId=${requestId} code=${errorCode} message=${errorMessage}`
    );
    throw new Error(`${errorCode}: ${errorMessage}`);
  }

  private summarizeLlmConfig(payload: Record<string, unknown>) {
    const config = payload.Config;
    const llmConfig =
      config && typeof config === "object" && "LLMConfig" in config
        ? (config as { LLMConfig?: Record<string, unknown> }).LLMConfig
        : null;

    if (!llmConfig || typeof llmConfig !== "object") {
      return "none";
    }

    const endpoint =
      typeof llmConfig.EndpointId === "string"
        ? llmConfig.EndpointId
        : typeof llmConfig.EndPointId === "string"
          ? llmConfig.EndPointId
          : "n/a";

    return `mode=${typeof llmConfig.Mode === "string" ? llmConfig.Mode : "n/a"},endpoint=${endpoint || "n/a"},model=n/a,keys=${Object.keys(
      llmConfig
    )
      .sort()
      .join("|")}`;
  }

  private summarizeTtsConfig(payload: Record<string, unknown>) {
    const config = payload.Config;
    const ttsConfig =
      config && typeof config === "object" && "TTSConfig" in config
        ? (
            config as {
              TTSConfig?: {
                Provider?: unknown;
                ProviderParams?: Record<string, unknown>;
              };
            }
          ).TTSConfig
        : null;

    if (!ttsConfig || typeof ttsConfig !== "object") {
      return "none";
    }

    const provider = typeof ttsConfig.Provider === "string" ? ttsConfig.Provider : "n/a";
    const params =
      ttsConfig.ProviderParams && typeof ttsConfig.ProviderParams === "object"
        ? ttsConfig.ProviderParams
        : null;

    if (!params) {
      return `provider=${provider},params=none`;
    }

    const encoding =
      typeof params.Encoding === "string"
        ? params.Encoding
        : typeof params.encoding === "string"
          ? params.encoding
          : "n/a";
    const voice =
      typeof params.VoiceType === "string"
        ? params.VoiceType
        : typeof params.voice_type === "string"
          ? params.voice_type
          : "n/a";

    return `provider=${provider},encoding=${encoding},voice=${voice},keys=${Object.keys(
      params
    )
      .sort()
      .join("|")}`;
  }
}
