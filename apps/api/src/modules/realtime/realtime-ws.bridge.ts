import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { OnModuleDestroy } from "@nestjs/common";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import {
  buildClientInterruptPayload,
  buildEndAsrPayload,
  buildFinishSessionPayload,
  buildTaskRequestPayload,
  DoubaoRealtimeEventReceive,
  parseDoubaoRealtimeFrame,
} from "../../common/volcengine/doubao-realtime.protocol";
import { DoubaoRealtimeService } from "../../common/volcengine/doubao-realtime.service";
import { RealtimeService } from "./realtime.service";

type ClientControlMessage =
  | { type: "input_audio_buffer.commit" }
  | { type: "response.create" }
  | { type: "response.cancel" }
  | { type: "session.close" };

type BrowserEvent =
  | { type: "session.ready" }
  | {
      type: "session.closed";
      code?: number;
      reason?: string;
    }
  | { type: "turn.done" }
  | {
      type: "transcript";
      role: "user" | "assistant";
      messageId: string;
      content: string;
      contentType: "partial" | "final";
    }
  | {
      type: "audio.delta";
      chunk: string;
      sampleRate: number;
    }
  | {
      type: "error";
      message: string;
    };

@Injectable()
export class RealtimeWsBridge implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeWsBridge.name);
  private webSocketServer: WebSocketServer | null = null;
  private isAttached = false;

  constructor(
    @Inject(RealtimeService)
    private readonly realtimeService: RealtimeService,
    @Inject(DoubaoRealtimeService)
    private readonly doubaoRealtimeService: DoubaoRealtimeService
  ) {}

  attachServer(server: HttpServer) {
    if (this.isAttached) {
      return;
    }

    this.webSocketServer = new WebSocketServer({
      noServer: true,
    });

    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url ?? "/", "http://localhost");

      if (url.pathname !== "/api/realtime/ws") {
        return;
      }

      this.webSocketServer?.handleUpgrade(request, socket, head, (client) => {
        void this.handleClientConnection(client, request);
      });
    });

    this.isAttached = true;
  }

  async onModuleDestroy() {
    await new Promise<void>((resolve) => {
      this.webSocketServer?.close(() => resolve());
      if (!this.webSocketServer) {
        resolve();
      }
    });
  }

  private async handleClientConnection(client: WebSocket, request: IncomingMessage) {
    const url = new URL(request.url ?? "/", "http://localhost");
    const conversationId = url.searchParams.get("conversationId")?.trim();
    const visitorToken = url.searchParams.get("visitorToken")?.trim();

    if (!conversationId) {
      this.sendBrowserEvent(client, {
        type: "error",
        message: "Missing conversationId for realtime session.",
      });
      client.close(1008, "missing_conversation_id");
      return;
    }

    try {
      this.logger.log(
        `Browser realtime socket accepted: conversationId=${conversationId} visitorTokenPresent=${Boolean(visitorToken)}`
      );
      const context = await this.realtimeService.getConnectionContext(
        conversationId,
        visitorToken
      );
      const providerConnection = await this.doubaoRealtimeService.connect({
        scenario: context.scenario,
        selectedRole: context.selectedRole,
      });
      const provider = providerConnection.socket;
      const providerSessionId = providerConnection.sessionId;
      const assistantDrafts = new Map<string, string>();
      let currentUserMessageId = `user_${randomUUID()}`;
      let browserAudioChunks = 0;
      let browserAudioBytes = 0;
      let browserCommitCount = 0;
      let browserResponseCreateCount = 0;
      let providerAudioDeltaCount = 0;
      let providerTranscriptEventCount = 0;
      let isClosed = false;

      this.logger.log(
        `Realtime provider connected: conversationId=${conversationId} scenario=${context.scenario.id} role=${context.selectedRole.id} providerSessionId=${providerSessionId} dialogId=${providerConnection.dialogId ?? "n/a"} outputSampleRate=${context.outputSampleRate}`
      );

      const closeBoth = (code = 1000, reason = "session_closed") => {
        if (isClosed) {
          return;
        }

        isClosed = true;
        const safeCode = this.normalizeCloseCode(code);
        const safeReason = reason || "session_closed";

        if (provider.readyState === WebSocket.OPEN) {
          provider.send(buildFinishSessionPayload(providerSessionId));
          provider.close(safeCode, safeReason);
        } else if (provider.readyState === WebSocket.CONNECTING) {
          provider.close(safeCode, safeReason);
        }

        if (
          client.readyState === WebSocket.OPEN ||
          client.readyState === WebSocket.CONNECTING
        ) {
          client.close(safeCode, safeReason);
        }
      };

      provider.on("message", (data, isBinary) => {
        const buffer = isBinary
          ? Buffer.isBuffer(data)
            ? data
            : Buffer.from(data as ArrayBuffer)
          : Buffer.from(data.toString(), "utf8");
        const frame = parseDoubaoRealtimeFrame(buffer);

        if (frame.kind === "error") {
          const message =
            this.readString(frame.payload?.error) ??
            this.readString(frame.payload?.message) ??
            frame.rawText ??
            "Doubao realtime returned an unknown error.";

          this.logger.warn(
            `Upstream realtime error: conversationId=${conversationId} code=${frame.code} message=${message}`
          );
          this.sendBrowserEvent(client, {
            type: "error",
            message,
          });
          return;
        }

        if (frame.kind === "audio") {
          if (frame.event !== DoubaoRealtimeEventReceive.TtsResponse) {
            this.logger.log(
              `Upstream audio event ignored: conversationId=${conversationId} event=${frame.event ?? "unknown"} bytes=${frame.audio.byteLength}`
            );
            return;
          }

          providerAudioDeltaCount += 1;
          this.sendBrowserEvent(client, {
            type: "audio.delta",
            chunk: frame.audio.toString("base64"),
            sampleRate: context.outputSampleRate,
          });
          return;
        }

        if (frame.kind !== "json") {
          this.logger.warn(
            `Unexpected upstream frame: conversationId=${conversationId} event=${frame.event ?? "unknown"} bytes=${frame.payload.byteLength}`
          );
          return;
        }

        const payload = frame.payload ?? {};
        const type = frame.event;
        this.logger.log(
          `Upstream realtime event: conversationId=${conversationId} event=${type ?? "unknown"} sessionId=${frame.sessionId ?? "n/a"}`
        );

        if (type === DoubaoRealtimeEventReceive.AsrInfo) {
          currentUserMessageId =
            this.readString(payload.question_id) ?? `user_${randomUUID()}`;
          return;
        }

        if (type === DoubaoRealtimeEventReceive.AsrResponse) {
          const results = this.readAsrResults(payload);

          for (const result of results) {
            if (!result.text) {
              continue;
            }

            providerTranscriptEventCount += 1;
            this.sendBrowserEvent(client, {
              type: "transcript",
              role: "user",
              messageId: currentUserMessageId,
              content: result.text,
              contentType: result.isInterim ? "partial" : "final",
            });
          }
          return;
        }

        if (type === DoubaoRealtimeEventReceive.ChatResponse) {
          const assistantMessageId =
            this.readString(payload.reply_id) ?? `assistant_${randomUUID()}`;
          const mergedContent = this.mergeStreamingText(
            assistantDrafts.get(assistantMessageId) ?? "",
            this.readString(payload.content) ?? ""
          );

          if (!mergedContent) {
            return;
          }

          assistantDrafts.set(assistantMessageId, mergedContent);
          providerTranscriptEventCount += 1;
          this.sendBrowserEvent(client, {
            type: "transcript",
            role: "assistant",
            messageId: assistantMessageId,
            content: mergedContent,
            contentType: "partial",
          });
          return;
        }

        if (type === DoubaoRealtimeEventReceive.TtsSubtitle) {
          const assistantMessageId =
            this.readString(payload.reply_id) ??
            this.readString(payload.question_id) ??
            "assistant_tts_subtitle";
          const nextText =
            this.readString(payload.content) ??
            this.readString(payload.text) ??
            this.readString(payload.subtitle) ??
            "";
          const mergedContent = this.mergeStreamingText(
            assistantDrafts.get(assistantMessageId) ?? "",
            nextText
          );

          if (!mergedContent) {
            return;
          }

          assistantDrafts.set(assistantMessageId, mergedContent);
          providerTranscriptEventCount += 1;
          this.sendBrowserEvent(client, {
            type: "transcript",
            role: "assistant",
            messageId: assistantMessageId,
            content: mergedContent,
            contentType: "partial",
          });
          return;
        }

        if (
          type === DoubaoRealtimeEventReceive.TtsSentenceEnd ||
          type === DoubaoRealtimeEventReceive.ChatEnded ||
          type === DoubaoRealtimeEventReceive.TtsEnded
        ) {
          this.flushAssistantDrafts(client, assistantDrafts);
          this.sendBrowserEvent(client, {
            type: "turn.done",
          });
          return;
        }

        if (
          type === DoubaoRealtimeEventReceive.SessionCanceled ||
          type === DoubaoRealtimeEventReceive.SessionFinished
        ) {
          this.sendBrowserEvent(client, {
            type: "session.closed",
            code: 1000,
            reason: "provider_finished",
          });
          closeBoth(1000, "provider_finished");
          return;
        }

        if (
          type === DoubaoRealtimeEventReceive.ConnectionFailed ||
          type === DoubaoRealtimeEventReceive.SessionFailed ||
          type === DoubaoRealtimeEventReceive.DialogCommonError
        ) {
          const message =
            this.readString(payload.error) ??
            this.readString(payload.message) ??
            frame.rawText ??
            "Doubao realtime rejected the request.";
          this.sendBrowserEvent(client, {
            type: "error",
            message,
          });
          this.logger.warn(
            `Upstream realtime rejected event: conversationId=${conversationId} event=${type} message=${message}`
          );
          return;
        }
      });

      provider.on("close", (code, reasonBuffer) => {
        const reason = reasonBuffer.toString() || "no_reason";
        this.logger.warn(
          `Upstream realtime socket closed: conversationId=${conversationId} code=${code} reason=${reason} browserAudioChunks=${browserAudioChunks} browserAudioBytes=${browserAudioBytes} browserCommits=${browserCommitCount} responseCreates=${browserResponseCreateCount} providerAudioDeltas=${providerAudioDeltaCount} providerTranscriptEvents=${providerTranscriptEventCount}`
        );

        if (client.readyState === WebSocket.OPEN) {
          this.sendBrowserEvent(client, {
            type: "session.closed",
            code,
            reason,
          });
        }

        closeBoth(code, reason || "session_closed");
      });

      provider.on("error", (error) => {
        this.logger.warn(
          `Upstream realtime socket error: conversationId=${conversationId} message=${error.message}`
        );
        this.sendBrowserEvent(client, {
          type: "error",
          message: error.message,
        });
        closeBoth(1011, "provider_error");
      });

      client.on("message", (data, isBinary) => {
        if (provider.readyState !== WebSocket.OPEN) {
          this.logger.warn(
            `Browser message received while provider not open: conversationId=${conversationId} providerState=${provider.readyState}`
          );
          return;
        }

        if (isBinary) {
          const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
          browserAudioChunks += 1;
          browserAudioBytes += buffer.byteLength;
          provider.send(buildTaskRequestPayload(providerSessionId, buffer));
          return;
        }

        try {
          const payload = JSON.parse(data.toString()) as ClientControlMessage;
          this.logger.log(
            `Browser realtime control: conversationId=${conversationId} type=${payload.type}`
          );

          if (payload.type === "session.close") {
            closeBoth();
            return;
          }

          if (payload.type === "input_audio_buffer.commit") {
            browserCommitCount += 1;
            provider.send(buildEndAsrPayload(providerSessionId));
            this.logger.log(
              `Forwarding EndASR: conversationId=${conversationId} browserAudioChunks=${browserAudioChunks} browserAudioBytes=${browserAudioBytes}`
            );
            return;
          }

          if (payload.type === "response.create") {
            browserResponseCreateCount += 1;
            this.logger.log(
              `Ignoring response.create for openspeech push_to_talk session: conversationId=${conversationId} count=${browserResponseCreateCount}`
            );
            return;
          }

          if (payload.type === "response.cancel") {
            provider.send(buildClientInterruptPayload(providerSessionId));
            this.logger.log(
              `Forwarding ClientInterrupt: conversationId=${conversationId}`
            );
          }
        } catch (error) {
          this.sendBrowserEvent(client, {
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Invalid realtime control payload.",
          });
        }
      });

      client.on("close", (code, reasonBuffer) => {
        this.logger.log(
          `Browser realtime socket closed: conversationId=${conversationId} code=${code} reason=${reasonBuffer.toString() || "no_reason"}`
        );
        closeBoth();
      });

      client.on("error", (error) => {
        this.logger.warn(`Browser realtime socket failed: ${error.message}`);
        closeBoth(1011, "browser_error");
      });

      this.sendBrowserEvent(client, {
        type: "session.ready",
      });
      this.logger.log(`Browser realtime session ready: conversationId=${conversationId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to initialize realtime session.";
      this.logger.warn(
        `Failed to initialize realtime session: conversationId=${conversationId} message=${message}`
      );
      this.sendBrowserEvent(client, {
        type: "error",
        message,
      });
      client.close(1011, "init_failed");
    }
  }

  private flushAssistantDrafts(client: WebSocket, assistantDrafts: Map<string, string>) {
    for (const [messageId, content] of assistantDrafts.entries()) {
      if (!content) {
        continue;
      }

      this.sendBrowserEvent(client, {
        type: "transcript",
        role: "assistant",
        messageId,
        content,
        contentType: "final",
      });
    }

    assistantDrafts.clear();
  }

  private readAsrResults(payload: Record<string, unknown>) {
    const results = Array.isArray(payload.results) ? payload.results : [];
    return results
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        return {
          text: this.readString((item as Record<string, unknown>).text) ?? "",
          isInterim: (item as { is_interim?: unknown }).is_interim === true,
        };
      })
      .filter((item): item is { text: string; isInterim: boolean } => Boolean(item));
  }

  private mergeStreamingText(current: string, incoming: string) {
    if (!incoming) {
      return current;
    }

    if (!current) {
      return incoming;
    }

    if (incoming.startsWith(current)) {
      return incoming;
    }

    if (current.startsWith(incoming)) {
      return current;
    }

    return `${current}${incoming}`;
  }

  private readString(value: unknown) {
    return typeof value === "string" ? value : null;
  }

  private sendBrowserEvent(client: WebSocket, payload: BrowserEvent) {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    client.send(JSON.stringify(payload));
  }

  private normalizeCloseCode(code: number) {
    if (code < 1000 || code >= 5000 || code === 1005 || code === 1006 || code === 1015) {
      return 1011;
    }

    return code;
  }
}
