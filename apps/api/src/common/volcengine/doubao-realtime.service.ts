import type { PracticeScenario, ScenarioRole } from "@learn-chinese-ai/shared-types";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { RawData } from "ws";
import { WebSocket } from "ws";
import { DoubaoPromptBuilder } from "./doubao-prompt.builder";
import {
  buildStartConnectionPayload,
  buildStartSessionPayload,
  createRealtimeSessionId,
  DoubaoRealtimeEventReceive,
  type DoubaoRealtimeSessionConfig,
  parseDoubaoRealtimeFrame,
} from "./doubao-realtime.protocol";
import { volcengineConfig } from "./volcengine.config";
import { resolveScenarioOpeningLine } from "../scenario/resolve-scenario-opening-line";

interface ConnectDoubaoRealtimeInput {
  scenario: PracticeScenario;
  selectedRole: ScenarioRole;
}

interface ConnectDoubaoRealtimeResult {
  socket: WebSocket;
  sessionId: string;
  dialogId: string | null;
  model: string;
  voice: string;
}

const OPENSPEECH_DEFAULT_VOICE = "zh_female_vv_jupiter_bigtts";

@Injectable()
export class DoubaoRealtimeService {
  private readonly logger = new Logger(DoubaoRealtimeService.name);

  constructor(
    @Inject(volcengineConfig.KEY)
    private readonly config: ConfigType<typeof volcengineConfig>,
    @Inject(DoubaoPromptBuilder)
    private readonly promptBuilder: DoubaoPromptBuilder
  ) {}

  async connect(input: ConnectDoubaoRealtimeInput): Promise<ConnectDoubaoRealtimeResult> {
    this.assertRealtimeConfig();
    const realtimeUrl = this.buildRealtimeUrl();
    const headers = this.buildRealtimeHeaders(realtimeUrl);
    const voice = this.resolveRealtimeVoice();
    const model = this.resolveRealtimeModel();

    this.logger.log(
      `Connecting to Doubao realtime: host=${new URL(realtimeUrl).host} model=${model ?? "auto"} voice=${voice} headerKeys=${Object.keys(
        headers
      )
        .sort()
        .join("|")}`
    );

    if (this.usesApiKeyAuth() && this.looksLikeUuid(this.config.realtimeApiKey)) {
      this.logger.log("Using openspeech API-Key auth mode.");
    }

    if (!this.usesApiKeyAuth() && this.looksLikeUuid(this.config.realtimeAccessKey)) {
      this.logger.warn(
        "DOUBAO realtime access key looks like a console API key UUID. Legacy openspeech auth usually expects a speech access key."
      );
    }

    const socket = new WebSocket(realtimeUrl, {
      headers,
    });

    await new Promise<void>((resolve, reject) => {
      const handleOpen = () => {
        cleanup();
        this.logger.log("Doubao realtime websocket connected.");
        resolve();
      };
      const handleError = (error: Error) => {
        cleanup();
        this.logger.warn(`Doubao realtime websocket connect failed: ${error.message}`);
        reject(error);
      };
      const handleUnexpectedResponse = (
        request: IncomingMessage,
        response: IncomingMessage
      ) => {
        const statusCode = response.statusCode ?? 0;
        const statusMessage = response.statusMessage ?? "unknown";
        let body = "";

        response.on("data", (chunk) => {
          body += chunk.toString();
        });

        response.on("end", () => {
          cleanup();
          const upstreamMessage = this.extractUpstreamHandshakeError(body);
          const error = new Error(
            `Doubao realtime handshake failed with ${statusCode} ${statusMessage}${upstreamMessage ? `: ${upstreamMessage}` : ""}`.trim()
          );
          this.logger.error(
            `${error.message} headers=${JSON.stringify(response.headers)} requestPath=${request.url ?? "n/a"}`
          );
          reject(error);
        });
      };
      const cleanup = () => {
        socket.off("open", handleOpen);
        socket.off("error", handleError);
        socket.off("unexpected-response", handleUnexpectedResponse);
      };

      socket.on("open", handleOpen);
      socket.on("error", handleError);
      socket.on("unexpected-response", handleUnexpectedResponse);
    });

    await this.waitForConnectionStart(socket);
    const sessionId = createRealtimeSessionId();
    const sessionConfig = this.buildSessionConfig(input, model, voice);
    socket.send(buildStartSessionPayload(sessionId, sessionConfig));
    this.logger.log(
      `Sent StartSession to Doubao realtime: scenario=${input.scenario.id} role=${input.selectedRole.id} sessionId=${sessionId}`
    );
    const dialogId = await this.waitForSessionStart(socket, sessionId);

    return {
      socket,
      sessionId,
      dialogId,
      model: model ?? "auto",
      voice,
    };
  }

  private buildRealtimeUrl() {
    return new URL(this.resolveRealtimeWsUrl()).toString();
  }

  private resolveRealtimeWsUrl() {
    if (!this.config.realtimeWsUrl.includes("openspeech.bytedance.com")) {
      throw new Error(
        `Unsupported Doubao realtime endpoint for current implementation: ${this.config.realtimeWsUrl}.`
      );
    }

    return this.config.realtimeWsUrl;
  }

  private resolveRealtimeModel() {
    if (!this.config.realtimeModel || this.config.realtimeModel === "default") {
      return null;
    }

    if (this.config.realtimeModel === "AG-voice-chat-agent") {
      this.logger.warn(
        `Ignoring incompatible realtime model=${this.config.realtimeModel}. openspeech will use the server-side default model.`
      );
      return null;
    }

    return this.config.realtimeModel;
  }

  private resolveRealtimeVoice() {
    if (!this.config.realtimeVoice || this.config.realtimeVoice === "default") {
      return OPENSPEECH_DEFAULT_VOICE;
    }

    return this.config.realtimeVoice;
  }

  private buildRealtimeHeaders(realtimeUrl: string) {
    const url = new URL(realtimeUrl);

    if (!url.hostname.includes("openspeech.bytedance.com")) {
      throw new Error(`Unsupported Doubao realtime host: ${url.hostname}.`);
    }

    if (this.usesApiKeyAuth()) {
      return {
        "X-Api-Key": this.config.realtimeApiKey,
        "X-Api-Resource-Id": this.config.realtimeResourceId,
        "X-Api-Connect-Id": randomUUID(),
      };
    }

    return {
      "X-Api-App-Key": this.config.realtimeAppId,
      "X-Api-App-ID": this.config.realtimeAppId,
      "X-Api-App-Id": this.config.realtimeAppId,
      "X-Api-Access-Key": this.config.realtimeAccessKey,
      "X-Api-Resource-Id": this.config.realtimeResourceId,
      "X-Api-Connect-Id": randomUUID(),
    };
  }

  private assertRealtimeConfig() {
    const missing: string[] = [];
    const resolvedRealtimeWsUrl = this.resolveRealtimeWsUrl();

    if (!resolvedRealtimeWsUrl) {
      missing.push("DOUBAO_REALTIME_WS_URL");
    }

    if (!this.config.realtimeApiKey && !this.config.realtimeAccessKey) {
      missing.push("DOUBAO_API_KEY or DOUBAO_REALTIME_ACCESS_KEY");
    }

    if (!this.usesApiKeyAuth() && !this.config.realtimeAppId) {
      missing.push("DOUBAO_REALTIME_APP_ID");
    }

    if (!this.config.realtimeVoice) {
      missing.push("DOUBAO_REALTIME_VOICE");
    }

    if (missing.length > 0) {
      throw new Error(
        `Doubao Realtime is missing required config: ${missing.join(", ")}`
      );
    }
  }

  private async waitForConnectionStart(socket: WebSocket) {
    socket.send(buildStartConnectionPayload());
    this.logger.log("Sent StartConnection to Doubao realtime.");

    await this.waitForFrame(
      socket,
      (frame) =>
        frame.kind === "error" ||
        (frame.kind === "json" &&
          (frame.event === DoubaoRealtimeEventReceive.ConnectionStarted ||
            frame.event === DoubaoRealtimeEventReceive.ConnectionFailed)),
      10000,
      "start-connection"
    );
  }

  private async waitForSessionStart(socket: WebSocket, sessionId: string) {
    const frame = await this.waitForFrame(
      socket,
      (candidate) =>
        candidate.kind === "error" ||
        (candidate.kind === "json" &&
          candidate.sessionId === sessionId &&
          (candidate.event === DoubaoRealtimeEventReceive.SessionStarted ||
            candidate.event === DoubaoRealtimeEventReceive.SessionFailed ||
            candidate.event === DoubaoRealtimeEventReceive.DialogCommonError)),
      15000,
      "start-session"
    );

    if (frame.kind !== "json") {
      throw new Error("Doubao realtime returned an invalid session start response.");
    }

    return this.readString(frame.payload?.dialog_id) ?? null;
  }

  private waitForFrame(
    socket: WebSocket,
    matcher: (frame: ReturnType<typeof parseDoubaoRealtimeFrame>) => boolean,
    timeoutMs: number,
    stage: string
  ) {
    return new Promise<ReturnType<typeof parseDoubaoRealtimeFrame>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Doubao realtime ${stage} timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      const handleMessage = (data: RawData, isBinary: boolean) => {
        const buffer = isBinary
          ? Buffer.isBuffer(data)
            ? data
            : Buffer.from(data as ArrayBuffer)
          : Buffer.from(data.toString(), "utf8");
        const frame = parseDoubaoRealtimeFrame(buffer);

        if (!matcher(frame)) {
          return;
        }

        cleanup();

        if (frame.kind === "error") {
          reject(
            new Error(
              this.readString(frame.payload?.error) ??
                this.readString(frame.payload?.message) ??
                frame.rawText ??
                "Doubao realtime returned an unknown error."
            )
          );
          return;
        }

        if (
          frame.kind === "json" &&
          (frame.event === DoubaoRealtimeEventReceive.ConnectionFailed ||
            frame.event === DoubaoRealtimeEventReceive.SessionFailed ||
            frame.event === DoubaoRealtimeEventReceive.DialogCommonError)
        ) {
          reject(
            new Error(
              this.readString(frame.payload?.error) ??
                this.readString(frame.payload?.message) ??
                frame.rawText ??
                "Doubao realtime rejected the request."
            )
          );
          return;
        }

        resolve(frame);
      };

      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const handleClose = (code: number, reasonBuffer: Buffer) => {
        cleanup();
        reject(
          new Error(
            `Doubao realtime closed during ${stage} (${code}: ${reasonBuffer.toString() || "no_reason"}).`
          )
        );
      };

      const cleanup = () => {
        clearTimeout(timeout);
        socket.off("message", handleMessage);
        socket.off("error", handleError);
        socket.off("close", handleClose);
      };

      socket.on("message", handleMessage);
      socket.on("error", handleError);
      socket.on("close", handleClose);
    });
  }

  private buildSessionConfig(
    input: ConnectDoubaoRealtimeInput,
    model: string | null,
    voice: string
  ): DoubaoRealtimeSessionConfig {
    const openingLine = resolveScenarioOpeningLine(input.scenario, input.selectedRole.id);

    return {
      dialog: {
        bot_name: this.config.botName,
        system_role: this.promptBuilder.build(input),
        dialog_context: [
          {
            role: "assistant",
            text: openingLine,
            timestamp: Date.now(),
          },
        ],
        extra: {
          input_mod: "push_to_talk",
          ...(model ? { model } : {}),
        },
      },
      tts: {
        speaker: voice,
        audio_config: {
          channel: 1,
          format: "pcm_s16le",
          sample_rate: this.config.realtimeOutputSampleRate,
        },
      },
      asr: {
        audio_info: {
          format: "pcm",
          sample_rate: this.config.realtimeInputSampleRate,
          channel: 1,
        },
        extra: {
          end_smooth_window_ms: this.config.realtimeVadSilenceMs,
          enable_custom_vad: false,
          enable_asr_twopass: false,
        },
      },
    };
  }

  private readString(value: unknown) {
    return typeof value === "string" ? value : null;
  }

  private usesApiKeyAuth() {
    return Boolean(this.config.realtimeApiKey);
  }

  private extractUpstreamHandshakeError(body: string) {
    if (!body) {
      return null;
    }

    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      return (
        this.readString(parsed.error) ??
        this.readString(parsed.message) ??
        body.trim() ??
        null
      );
    } catch {
      return body.trim() || null;
    }
  }

  private looksLikeUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  }
}
