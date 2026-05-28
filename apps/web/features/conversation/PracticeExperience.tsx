/* eslint-disable no-unused-vars */
"use client";

import type {
  ConversationReply,
  ConversationCloseResponse,
  MessageItem,
  PracticeMode,
  RealtimeSessionResponse,
  ScenarioId,
  RealtimeVoiceChatSession,
  StartRealtimeVoiceChatRequest,
} from "@learn-chinese-ai/shared-types";
import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { Mic2, Pause, RotateCcw, Sparkles, Square, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getVisitorToken } from "../../lib/visitor-token";

type RtcModule = typeof import("@volcengine/rtc");
type RtcEngine = import("@volcengine/rtc").IRTCEngine;

type SessionState =
  | "loading"
  | "ready"
  | "recording"
  | "paused"
  | "ending"
  | "ended"
  | "error";

interface PracticeExperienceProps {
  initialScenarioId?: string;
  initialRoleId?: string;
  initialMode?: string;
}

interface SubtitleDraft {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentType: "partial" | "final";
  createdAt: string;
}

interface RtcSubtitleMessage {
  userId?: string;
  text?: string;
  sequence?: number;
  definite?: boolean;
  paragraph?: boolean;
  roundId?: string | number;
}

const RTC_DEBUG_PREFIX = "[practice-rtc]";
const ENABLE_LOCAL_FALLBACK = false;
const LOCAL_RECOGNITION_DRAFT_ID = "local-recognition-draft";

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: null | (() => void);
  onend: null | (() => void);
  onerror: null | ((event: unknown) => void);
  onresult: null | ((event: BrowserSpeechRecognitionEvent) => void);
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function isScenarioId(value?: string): value is ScenarioId {
  return (
    value === "daily-cafe" ||
    value === "interview-intro" ||
    value === "travel-hotel" ||
    value === "business-meeting" ||
    value === "free-chat"
  );
}

function isPracticeMode(value?: string): value is PracticeMode {
  return value === "scenario" || value === "free";
}

function upsertTranscriptMessage(messages: MessageItem[], next: SubtitleDraft) {
  const index = messages.findIndex((message) => message.id === next.id);

  if (index === -1) {
    return [...messages, next];
  }

  const updated = [...messages];
  updated[index] = next;
  return updated;
}

function parseRtcSubtitlePayload(message: ArrayBuffer): RtcSubtitleMessage[] {
  const bytes = new Uint8Array(message);

  if (bytes.byteLength < 8) {
    return [];
  }

  const header = new TextDecoder().decode(bytes.subarray(0, 4));

  if (header !== "subv") {
    return [];
  }

  const payloadLength = new DataView(message).getUint32(4);
  const payloadBytes = bytes.subarray(8, 8 + payloadLength);

  if (payloadBytes.byteLength === 0) {
    return [];
  }

  const payloadText = new TextDecoder().decode(payloadBytes);
  const payload = JSON.parse(payloadText) as {
    data?: RtcSubtitleMessage | RtcSubtitleMessage[];
  };

  if (!payload.data) {
    return [];
  }

  return Array.isArray(payload.data) ? payload.data : [payload.data];
}

export function PracticeExperience({
  initialScenarioId,
  initialRoleId,
  initialMode,
}: PracticeExperienceProps) {
  const router = useRouter();
  const engineRef = useRef<RtcEngine | null>(null);
  const rtcModuleRef = useRef<RtcModule | null>(null);
  const joinedRoomRef = useRef(false);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechRecognitionShouldRunRef = useRef(false);
  const hasRtcSubtitleTrafficRef = useRef(false);
  const fallbackReplyInFlightRef = useRef(false);

  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [session, setSession] = useState<RealtimeSessionResponse | null>(null);
  const [transcript, setTranscript] = useState<MessageItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoleId);

  const scenarioId = isScenarioId(initialScenarioId) ? initialScenarioId : undefined;
  const mode = isPracticeMode(initialMode)
    ? initialMode
    : scenarioId
      ? "scenario"
      : "free";
  const canSwitchRole =
    sessionState === "ready" || sessionState === "ended" || sessionState === "error";

  function logRtc(event: string, payload?: unknown) {
    if (payload === undefined) {
      console.info(`${RTC_DEBUG_PREFIX} ${event}`);
      return;
    }

    console.info(`${RTC_DEBUG_PREFIX} ${event}`, payload);
  }

  function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
    if (typeof window === "undefined") {
      return null;
    }

    return (
      (
        window as Window & {
          SpeechRecognition?: new () => BrowserSpeechRecognition;
          webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
        }
      ).SpeechRecognition ??
      (
        window as Window & {
          SpeechRecognition?: new () => BrowserSpeechRecognition;
          webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
        }
      ).webkitSpeechRecognition ??
      null
    );
  }

  function stopBrowserSpeechRecognition() {
    speechRecognitionShouldRunRef.current = false;

    try {
      speechRecognitionRef.current?.stop();
    } catch (error) {
      logRtc("local-recognition-stop-error", error);
    }

    speechRecognitionRef.current = null;
  }

  function cancelAssistantSpeechPlayback() {
    if (typeof window === "undefined") {
      return;
    }

    window.speechSynthesis?.cancel();
  }

  function removeLocalRecognitionDraft(current: MessageItem[]) {
    return current.filter((message) => message.id !== LOCAL_RECOGNITION_DRAFT_ID);
  }

  function speakAssistantMessage(content: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      logRtc("assistant-speech-unsupported");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "zh-CN";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    logRtc("assistant-speech-started", { content });
  }

  async function submitFallbackReply(
    currentSession: RealtimeSessionResponse,
    content: string
  ) {
    const normalizedContent = content.trim();

    if (!normalizedContent || fallbackReplyInFlightRef.current) {
      return;
    }

    fallbackReplyInFlightRef.current = true;
    logRtc("fallback-reply-request", {
      conversationId: currentSession.conversationId,
      content: normalizedContent,
    });

    try {
      const reply = await apiRequest<ConversationReply>(
        `/conversations/${currentSession.conversationId}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ content: normalizedContent }),
        }
      );

      setTranscript((current) => [
        ...removeLocalRecognitionDraft(current),
        reply.userMessage,
        reply.assistantMessage,
      ]);
      logRtc("fallback-reply-success", reply);
      speakAssistantMessage(reply.assistantMessage.content);
    } catch (error) {
      logRtc("fallback-reply-error", error);
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to generate a fallback reply."
      );
    } finally {
      fallbackReplyInFlightRef.current = false;
    }
  }

  function startBrowserSpeechRecognition(currentSession: RealtimeSessionResponse) {
    const RecognitionCtor = getSpeechRecognitionCtor();

    if (!RecognitionCtor) {
      logRtc("local-recognition-unsupported");
      return;
    }

    if (speechRecognitionRef.current) {
      return;
    }

    const recognition = new RecognitionCtor();
    speechRecognitionShouldRunRef.current = true;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.onstart = () => {
      logRtc("local-recognition-started");
    };
    recognition.onend = () => {
      logRtc("local-recognition-ended");
      speechRecognitionRef.current = null;

      if (speechRecognitionShouldRunRef.current) {
        window.setTimeout(() => {
          startBrowserSpeechRecognition(currentSession);
        }, 150);
      }
    };
    recognition.onerror = (event) => {
      logRtc("local-recognition-error", event);
    };
    recognition.onresult = (event) => {
      let interimTranscript = "";
      const finalizedSegments: string[] = [];

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) {
          continue;
        }
        const transcript = result?.[0]?.transcript?.trim();

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          finalizedSegments.push(transcript);
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      if (interimTranscript) {
        setTranscript((current) => {
          const next = removeLocalRecognitionDraft(current);
          return [
            ...next,
            {
              id: LOCAL_RECOGNITION_DRAFT_ID,
              role: "user",
              content: interimTranscript,
              contentType: "partial",
              createdAt: new Date().toISOString(),
            },
          ];
        });
        logRtc("local-recognition-interim", { content: interimTranscript });
      }

      if (!finalizedSegments.length) {
        return;
      }

      const finalContent = finalizedSegments.join(" ").trim();

      if (!finalContent) {
        return;
      }

      logRtc("local-recognition-final", {
        content: finalContent,
        rtcSubtitleTraffic: hasRtcSubtitleTrafficRef.current,
      });

      if (!hasRtcSubtitleTrafficRef.current) {
        void submitFallbackReply(currentSession, finalContent);
      }
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  }

  async function requestSession(roleId = selectedRoleId) {
    hasRtcSubtitleTrafficRef.current = false;
    logRtc("request-session", {
      scenarioId,
      roleId,
      mode,
    });
    return apiRequest<RealtimeSessionResponse>("/realtime/session", {
      method: "POST",
      body: JSON.stringify({
        scenarioId,
        roleId,
        mode,
        visitorToken: getVisitorToken(),
      }),
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function createSession() {
      try {
        setSessionState("loading");
        setErrorMessage("");
        const nextSession = await requestSession();

        if (cancelled) {
          return;
        }

        setSession(nextSession);
        setSelectedRoleId(nextSession.selectedRole.id);
        setTranscript(nextSession.initialTranscript);
        logRtc("session-ready", {
          conversationId: nextSession.conversationId,
          roomId: nextSession.rtc.roomId,
          rtcUserId: nextSession.rtc.userId,
          botUserId: nextSession.rtc.botUserId,
          voiceChatStatus: nextSession.voiceChat.status,
          voiceChatErrorMessage: nextSession.voiceChat.errorMessage,
        });

        if (nextSession.voiceChat.status === "failed") {
          setSessionState("error");
          setErrorMessage(
            nextSession.voiceChat.errorMessage ??
              "RTC AI bot failed to start. Check server logs and Volcengine speech config."
          );
          return;
        }

        setSessionState("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSessionState("error");
        logRtc("session-error", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to prepare session."
        );
      }
    }

    void createSession();

    return () => {
      cancelled = true;
    };
  }, [mode, scenarioId, selectedRoleId]);

  useEffect(() => {
    return () => {
      void teardownRtc();
    };
  }, []);

  useEffect(() => {
    if (!transcript.length) {
      return;
    }

    const latestMessage = transcript[transcript.length - 1];
    logRtc("transcript-updated", {
      count: transcript.length,
      latestMessage: latestMessage
        ? {
            id: latestMessage.id,
            role: latestMessage.role,
            contentType: latestMessage.contentType,
            content: latestMessage.content,
          }
        : null,
    });
  }, [transcript]);

  async function ensureRtcModule() {
    if (!rtcModuleRef.current) {
      rtcModuleRef.current = await import("@volcengine/rtc");
    }

    return rtcModuleRef.current;
  }

  async function teardownRtc() {
    try {
      stopBrowserSpeechRecognition();
      cancelAssistantSpeechPlayback();
      if (engineRef.current) {
        logRtc("teardown-begin");
        await engineRef.current.stopAudioCapture?.();
        await engineRef.current.leaveRoom?.();
      }
    } catch (error) {
      logRtc("teardown-error", error);
    } finally {
      if (engineRef.current && rtcModuleRef.current) {
        rtcModuleRef.current.default.destroyEngine(engineRef.current);
      }

      logRtc("teardown-complete");
      engineRef.current = null;
      joinedRoomRef.current = false;
    }
  }

  async function startRealtimeConversation(
    currentSession: RealtimeSessionResponse | null = session,
    allowTokenRetry = true
  ) {
    if (!currentSession) {
      return;
    }

    try {
      setErrorMessage("");
      logRtc("start-click", {
        hasSession: Boolean(currentSession),
        joinedRoom: joinedRoomRef.current,
      });

      if (!joinedRoomRef.current) {
        const rtcModule = await ensureRtcModule();
        const engine = rtcModule.default.createEngine(currentSession.rtc.appId);
        const EngineEventsTypes = rtcModule.default.events;
        const { MediaType, RoomProfileType, SUBTITLE_MODE } = rtcModule;

        engine.on(EngineEventsTypes.onError, (event) => {
          logRtc("rtc-error", event);
          setSessionState("error");
          setErrorMessage(`RTC error: ${event.errorCode}`);
        });

        engine.on(EngineEventsTypes.onConnectionStateChanged, (event) => {
          logRtc("connection-state-changed", event);
        });

        engine.on(EngineEventsTypes.onAudioDeviceStateChanged, (event) => {
          logRtc("audio-device-state-changed", event);
        });

        engine.on(EngineEventsTypes.onLocalAudioPropertiesReport, (event) => {
          logRtc(
            "local-audio-properties-report",
            event.map((item) => ({
              streamIndex: item.streamIndex,
              linearVolume: item.audioPropertiesInfo.linearVolume,
              nonlinearVolume: item.audioPropertiesInfo.nonlinearVolume,
            }))
          );
        });

        engine.on(EngineEventsTypes.onRemoteAudioPropertiesReport, (event) => {
          logRtc(
            "remote-audio-properties-report",
            event.map((item) => ({
              userId: item.streamKey.userId,
              linearVolume: item.audioPropertiesInfo.linearVolume,
              nonlinearVolume: item.audioPropertiesInfo.nonlinearVolume,
            }))
          );
        });

        engine.on(EngineEventsTypes.onUserPublishStream, async (event) => {
          logRtc("user-publish-stream", event);
          if (event.userId === currentSession.rtc.userId) {
            return;
          }

          await engine.subscribeStream(event.userId, MediaType.AUDIO);
          await engine.play(event.userId, MediaType.AUDIO);
          logRtc("remote-audio-play-started", { userId: event.userId });
          logRtc("subscribed-remote-audio", { userId: event.userId });
        });

        engine.on(EngineEventsTypes.onUserJoined, (event) => {
          logRtc("user-joined", event);
        });

        engine.on(EngineEventsTypes.onUserLeave, (event) => {
          logRtc("user-left", event);
        });

        engine.on(EngineEventsTypes.onUserStartAudioCapture, async (event) => {
          logRtc("user-start-audio-capture", event);
          if (event.userId === currentSession.rtc.userId) {
            return;
          }

          await engine.play(event.userId, MediaType.AUDIO);
          logRtc("remote-audio-play-started", { userId: event.userId });
        });

        engine.on(EngineEventsTypes.onUserStopAudioCapture, (event) => {
          logRtc("user-stop-audio-capture", event);
        });

        engine.on(EngineEventsTypes.onSubtitleStateChanged, (event) => {
          logRtc("subtitle-state-changed", event);
          if (event.event === 2) {
            const nextErrorMessage =
              event.errorMessage === "ServiceAccessDenied"
                ? "RTC subtitle service is not enabled or not authorized in the current Volcengine account."
                : (event.errorMessage ??
                  "RTC subtitle service returned an unknown error.");
            setErrorMessage(nextErrorMessage);
          }
        });

        engine.on(EngineEventsTypes.onSubtitleMessageReceived, (messages) => {
          hasRtcSubtitleTrafficRef.current = true;
          logRtc("subtitle-message-received", messages);
          setTranscript((current) => {
            let nextMessages = current.filter(
              (message) => message.contentType === "final"
            );

            for (const message of messages) {
              const role =
                message.userId === currentSession.rtc.userId ? "user" : "assistant";
              const draftId = `sub_${message.userId}_${message.sequence}`;

              nextMessages = upsertTranscriptMessage(nextMessages, {
                id: draftId,
                role,
                content: message.text,
                contentType: message.definite ? "final" : "partial",
                createdAt: new Date().toISOString(),
              });
            }

            return nextMessages;
          });
        });

        engine.on(EngineEventsTypes.onRoomBinaryMessageReceived, (event) => {
          try {
            hasRtcSubtitleTrafficRef.current = true;
            logRtc("room-binary-message-received", {
              userId: event.userId,
              byteLength: event.message.byteLength,
            });
            const subtitleMessages = parseRtcSubtitlePayload(event.message);

            if (!subtitleMessages.length) {
              logRtc("room-binary-message-ignored", {
                userId: event.userId,
                byteLength: event.message.byteLength,
              });
              return;
            }

            logRtc("room-binary-subtitle-parsed", subtitleMessages);

            setTranscript((current) => {
              const finalizedMessages = current.filter(
                (message) => message.contentType === "final"
              );
              const partialMessages = current.filter(
                (message) => message.contentType === "partial"
              );
              let nextMessages = [...finalizedMessages];

              for (const message of subtitleMessages) {
                if (!message.text?.trim()) {
                  continue;
                }

                const speakerUserId = message.userId ?? event.userId;
                const role =
                  speakerUserId === currentSession.rtc.userId ? "user" : "assistant";
                const draftId = `subv_${speakerUserId}_${String(message.roundId ?? "default")}`;
                const existingPartialIndex = partialMessages.findIndex(
                  (item) => item.id === draftId
                );
                const createdAt =
                  existingPartialIndex === -1
                    ? new Date().toISOString()
                    : (partialMessages[existingPartialIndex]?.createdAt ??
                      new Date().toISOString());
                const contentType = message.paragraph ? "final" : "partial";

                nextMessages = upsertTranscriptMessage(nextMessages, {
                  id: draftId,
                  role,
                  content: message.text,
                  contentType,
                  createdAt,
                });
              }

              return nextMessages.sort((left, right) =>
                left.createdAt.localeCompare(right.createdAt)
              );
            });
          } catch (error) {
            logRtc("room-binary-message-parse-error", error);
          }
        });

        logRtc("join-room-begin", {
          roomId: currentSession.rtc.roomId,
          rtcUserId: currentSession.rtc.userId,
          botUserId: currentSession.rtc.botUserId,
        });
        await engine.joinRoom(
          currentSession.rtc.token,
          currentSession.rtc.roomId,
          {
            userId: currentSession.rtc.userId,
            extraInfo: JSON.stringify({
              source_language: "zh",
              user_name: currentSession.rtc.userId,
              user_id: currentSession.rtc.userId,
              call_scene: "RTC-AIGC",
            }),
          },
          {
            isAutoPublish: false,
            isAutoSubscribeAudio: true,
            isAutoSubscribeVideo: false,
            roomProfileType: RoomProfileType.chat,
          }
        );
        logRtc("join-room-success", {
          roomId: currentSession.rtc.roomId,
          rtcUserId: currentSession.rtc.userId,
        });
        await engine.setUserVisibility(true);
        logRtc("user-visibility-set", { visible: true });
        engine.enableAudioPropertiesReport({ interval: 300 });
        logRtc("audio-properties-report-enabled", { interval: 300 });
        await engine.setAudioCaptureConfig({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        logRtc("audio-capture-config-set", {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        await engine.startAudioCapture();
        logRtc("audio-capture-started");
        await engine.publishStream(MediaType.AUDIO);
        logRtc("audio-stream-published");
        const voiceChat = await apiRequest<RealtimeVoiceChatSession>(
          `/realtime/session/${currentSession.conversationId}/start`,
          {
            method: "POST",
            body: JSON.stringify({
              roomId: currentSession.rtc.roomId,
              userId: currentSession.rtc.userId,
              botUserId: currentSession.rtc.botUserId,
            } satisfies StartRealtimeVoiceChatRequest),
          }
        );
        logRtc("voice-chat-started", voiceChat);
        setSession((previous) =>
          previous
            ? {
                ...previous,
                voiceChat,
              }
            : previous
        );

        if (voiceChat.status === "failed") {
          throw new Error(
            voiceChat.errorMessage ??
              "RTC AI bot failed to join the room after room join."
          );
        }

        window.setTimeout(() => {
          void engine.subscribeStream(currentSession.rtc.botUserId, MediaType.AUDIO).then(
            async () => {
              await engine.play(currentSession.rtc.botUserId, MediaType.AUDIO);
              logRtc("remote-audio-play-started", {
                userId: currentSession.rtc.botUserId,
              });
              logRtc("subscribed-remote-audio-by-bot-user-id", {
                userId: currentSession.rtc.botUserId,
              });
            },
            (error) => {
              logRtc("subscribe-remote-audio-by-bot-user-id-error", {
                userId: currentSession.rtc.botUserId,
                error,
              });
            }
          );
        }, 1200);

        await engine.startSubtitle({
          mode: SUBTITLE_MODE.ASR_ONLY,
        });
        logRtc("subtitle-start-requested", {
          mode: "ASR_ONLY",
        });
        if (ENABLE_LOCAL_FALLBACK) {
          startBrowserSpeechRecognition(currentSession);
        }

        engineRef.current = engine;
        joinedRoomRef.current = true;
      } else {
        await engineRef.current?.startAudioCapture();
        logRtc("audio-capture-resumed");
        if (ENABLE_LOCAL_FALLBACK) {
          startBrowserSpeechRecognition(currentSession);
        }
      }

      setSessionState("recording");
    } catch (error) {
      logRtc("start-error", error);
      if (
        allowTokenRetry &&
        error instanceof Error &&
        error.message.includes("token_error")
      ) {
        try {
          setSessionState("loading");
          await teardownRtc();
          const refreshedSession = await requestSession();
          setSession(refreshedSession);
          setSelectedRoleId(refreshedSession.selectedRole.id);
          setTranscript(refreshedSession.initialTranscript);
          logRtc("token-retry-session-ready", {
            conversationId: refreshedSession.conversationId,
            roomId: refreshedSession.rtc.roomId,
          });
          return await startRealtimeConversation(refreshedSession, false);
        } catch (refreshError) {
          setSessionState("error");
          logRtc("token-retry-failed", refreshError);
          setErrorMessage(
            refreshError instanceof Error
              ? refreshError.message
              : "Failed to refresh the RTC session."
          );
          return;
        }
      }

      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start realtime conversation."
      );
    }
  }

  async function pauseRealtimeConversation() {
    try {
      stopBrowserSpeechRecognition();
      cancelAssistantSpeechPlayback();
      await engineRef.current?.stopAudioCapture();
      logRtc("audio-capture-paused");
      setSessionState("paused");
    } catch (error) {
      logRtc("pause-error", error);
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to pause the microphone."
      );
    }
  }

  async function restartRealtimeConversation() {
    logRtc("restart-click");
    await teardownRtc();
    setSessionState("loading");
    setErrorMessage("");
    const refreshedSession = await requestSession();
    setSession(refreshedSession);
    setSelectedRoleId(refreshedSession.selectedRole.id);
    setTranscript(refreshedSession.initialTranscript);
    await startRealtimeConversation(refreshedSession, false);
  }

  async function endSession() {
    if (!session) {
      return;
    }

    try {
      setSessionState("ending");
      logRtc("end-session-begin", {
        conversationId: session.conversationId,
      });
      await teardownRtc();

      const finalizedTranscript = transcript.filter(
        (message) => message.contentType === "final"
      );
      logRtc("end-session-transcript", {
        conversationId: session.conversationId,
        finalizedCount: finalizedTranscript.length,
        transcript: finalizedTranscript,
      });
      const result = await apiRequest<ConversationCloseResponse>(
        `/conversations/${session.conversationId}/close`,
        {
          method: "POST",
          body: JSON.stringify({ transcript: finalizedTranscript }),
        }
      );

      if (result.status) {
        setSessionState("ended");
      }

      logRtc("end-session-success", {
        conversationId: session.conversationId,
      });
      router.push(`/reports/${session.conversationId}`);
    } catch (error) {
      logRtc("end-session-error", error);
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to finish the conversation."
      );
    }
  }

  const currentStatusLabel =
    sessionState === "loading"
      ? "Preparing session"
      : sessionState === "ready"
        ? "Ready to join"
        : sessionState === "recording"
          ? "Live"
          : sessionState === "paused"
            ? "Paused"
            : sessionState === "ending"
              ? "Ending session"
              : sessionState === "ended"
                ? "Report ready"
                : "Error";

  return (
    <main>
      <PageShell className="space-y-10">
        <SectionHeading
          eyebrow="Practice"
          title="Realtime Mandarin Practice"
          description="This route uses the RTC AI interaction path. Pick a role before joining, then speak naturally and follow the live subtitles."
        />
        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <Card className="overflow-hidden border-0 shadow-[var(--shadow-float)]">
            <div className="border-b border-[var(--color-hairline-soft)] bg-white px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Live session
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--color-ink)]">
                    {session?.scenario.title ?? "Preparing scenario"}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-soft)] px-3 py-2">
                    <Waves className="h-4 w-4" strokeWidth={1.8} />
                    RTC AI interaction
                  </span>
                  <span>{currentStatusLabel}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-[var(--color-surface-soft)] p-6">
              {transcript.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[85%] rounded-[var(--radius-card)] px-5 py-4 text-sm leading-7 ${
                    item.role === "assistant"
                      ? "bg-white text-[var(--color-ink)]"
                      : "ml-auto bg-[var(--color-primary)] text-white"
                  } ${item.contentType === "partial" ? "opacity-70" : ""}`}
                >
                  {item.content}
                </div>
              ))}
              {errorMessage ? (
                <div className="rounded-[var(--radius-card)] bg-[#fff1f2] px-4 py-3 text-sm text-[#9f1239]">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="border-t border-[var(--color-hairline-soft)] bg-white px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-[var(--color-hairline-soft)] bg-white p-2 shadow-[var(--shadow-float)]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-label="Start realtime conversation"
                    onClick={() => void startRealtimeConversation()}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Mic2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Pause microphone capture"
                    onClick={() => void pauseRealtimeConversation()}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pause className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Restart the RTC session"
                    onClick={() => void restartRealtimeConversation()}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RotateCcw className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="End the conversation"
                    onClick={() => void endSession()}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Square className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                </div>
                <span className="px-4 text-sm text-[var(--color-muted)]">
                  Subtitles are streamed from the RTC session in real time.
                </span>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 shadow-[var(--shadow-float)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Session focus
              </p>
              <h3 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">
                {session?.scenario.goal ?? "Preparing goal"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-body)]">
                {session?.scenario.promptHint ??
                  "The side rail stays light. It should support the conversation."}
              </p>
              <div className="mt-5 space-y-3 text-sm text-[var(--color-body)]">
                <label className="block rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Role
                  </span>
                  <select
                    value={selectedRoleId}
                    onChange={(event) => {
                      setSelectedRoleId(event.target.value);
                    }}
                    disabled={!canSwitchRole}
                    className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {session?.scenario.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  Room ID: {session?.rtc.roomId ?? "Preparing"}
                </div>
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  Bot status: {session?.voiceChat.status ?? "Starting"}
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-[var(--shadow-float)]">
              <div className="flex items-center gap-2 text-[var(--color-primary)]">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                <span className="text-sm font-medium">Report preview</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--color-body)]">
                Once the session ends, the transcript is persisted to PostgreSQL and a
                structured report is generated from the saved dialogue.
              </p>
              <Button className="mt-6 w-full" onClick={() => void endSession()}>
                End session and generate report
              </Button>
            </Card>
          </div>
        </section>
      </PageShell>
    </main>
  );
}
