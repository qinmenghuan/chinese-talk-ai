/* eslint-disable no-unused-vars */
"use client";

import type {
  ConversationCloseResponse,
  ConversationReply,
  MessageItem,
  PracticeMode,
  RealtimeSessionResponse,
  ScenarioId,
} from "@learn-chinese-ai/shared-types";
import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import {
  Mic2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  Waves,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../lib/api";
import { getVisitorToken } from "../../lib/visitor-token";

type BrowserSpeechRecognitionEvent = Event & {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: {
      readonly isFinal: boolean;
      readonly length: number;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  readonly error: string;
};

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((_event: Event) => void) | null;
  onerror: ((_event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((_event: BrowserSpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

type SessionState =
  | "loading"
  | "ready"
  | "recording"
  | "assistant_speaking"
  | "paused"
  | "ending"
  | "ended"
  | "error";

interface PracticeExperienceProps {
  initialScenarioId?: string;
  initialRoleId?: string;
  initialMode?: string;
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

function getSpeechRecognitionConstructor():
  | BrowserSpeechRecognitionConstructor
  | undefined {
  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function PracticeExperience({
  initialScenarioId,
  initialRoleId,
  initialMode,
}: PracticeExperienceProps) {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [session, setSession] = useState<RealtimeSessionResponse | null>(null);
  const [transcript, setTranscript] = useState<MessageItem[]>([]);
  const [draftText, setDraftText] = useState("");
  const [volume, setVolume] = useState(0.9);
  const [errorMessage, setErrorMessage] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldResumeRef = useRef(false);

  const scenarioId = isScenarioId(initialScenarioId) ? initialScenarioId : undefined;
  const mode = isPracticeMode(initialMode)
    ? initialMode
    : scenarioId
      ? "scenario"
      : "free";

  const currentStatusLabel = useMemo(() => {
    switch (sessionState) {
      case "loading":
        return "Preparing session";
      case "ready":
        return "Ready";
      case "recording":
        return "Listening";
      case "assistant_speaking":
        return "AI speaking";
      case "paused":
        return "Paused";
      case "ending":
        return "Ending session";
      case "ended":
        return "Report ready";
      case "error":
        return "Error";
      default:
        return "Ready";
    }
  }, [sessionState]);

  useEffect(() => {
    let cancelled = false;

    async function createSession() {
      try {
        setSessionState("loading");
        setErrorMessage("");
        const nextSession = await apiRequest<RealtimeSessionResponse>(
          "/realtime/session",
          {
            method: "POST",
            body: JSON.stringify({
              scenarioId,
              roleId: initialRoleId,
              mode,
              visitorToken: getVisitorToken(),
            }),
          }
        );

        if (cancelled) {
          return;
        }

        setSession(nextSession);
        setTranscript(nextSession.initialTranscript);
        setSessionState("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSessionState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to prepare session."
        );
      }
    }

    void createSession();

    return () => {
      cancelled = true;
      recognitionRef.current?.abort();
      window.speechSynthesis.cancel();
    };
  }, [initialRoleId, mode, scenarioId]);

  const startRecognition = () => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionCtor) {
      setSessionState("error");
      setErrorMessage("This browser does not support speech recognition.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "zh-CN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let interimText = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];

          if (!result) {
            continue;
          }

          const chunk = result[0]?.transcript ?? "";

          if (result.isFinal) {
            setDraftText("");

            if (chunk.trim()) {
              void sendUserTurn(chunk);
            }
          } else {
            interimText += chunk;
          }
        }

        setDraftText(interimText);
      };

      recognition.onerror = (event) => {
        shouldResumeRef.current = false;
        setSessionState("error");
        setErrorMessage(`Speech recognition error: ${event.error}`);
      };

      recognition.onend = () => {
        if (shouldResumeRef.current) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
    }

    shouldResumeRef.current = true;
    setSessionState("recording");
    recognitionRef.current.start();
  };

  const pauseRecognition = () => {
    shouldResumeRef.current = false;
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    setSessionState("paused");
  };

  const speakAssistantMessage = async (content: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = "zh-CN";
      utterance.volume = volume;
      utterance.rate = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  };

  const sendUserTurn = async (content: string) => {
    if (!session) {
      return;
    }

    try {
      shouldResumeRef.current = false;
      recognitionRef.current?.stop();
      setSessionState("assistant_speaking");
      setErrorMessage("");

      const reply = await apiRequest<ConversationReply>(
        `/conversations/${session.conversationId}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      );

      setTranscript((current) => [...current, reply.userMessage, reply.assistantMessage]);
      await speakAssistantMessage(reply.assistantMessage.content);
      setSessionState("ready");
    } catch (error) {
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to continue conversation."
      );
    }
  };

  const restartListening = () => {
    setDraftText("");
    pauseRecognition();
    setTimeout(() => {
      startRecognition();
    }, 150);
  };

  const endSession = async () => {
    if (!session) {
      return;
    }

    try {
      setSessionState("ending");
      shouldResumeRef.current = false;
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();

      const result = await apiRequest<ConversationCloseResponse>(
        `/conversations/${session.conversationId}/close`,
        {
          method: "POST",
          body: JSON.stringify({ transcript }),
        }
      );

      if (result.status) {
        setSessionState("ended");
      }

      router.push(`/reports/${session.conversationId}`);
    } catch (error) {
      setSessionState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to finish the conversation."
      );
    }
  };

  return (
    <main>
      <PageShell className="space-y-10">
        <SectionHeading
          eyebrow="Practice"
          title="中文实时口语练习"
          description="场景会带入角色和练习目标。点击麦克风开始说中文，系统会实时记录文本，并继续用中文和你对话。"
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
                    {session?.providerSession.transport === "doubao"
                      ? "Doubao realtime prepared"
                      : "Mock realtime running"}
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
                  }`}
                >
                  {item.content}
                </div>
              ))}
              {draftText ? (
                <div className="ml-auto max-w-[85%] rounded-[var(--radius-card)] border border-dashed border-[var(--color-primary)] bg-white px-5 py-4 text-sm leading-7 text-[var(--color-ink)]">
                  {draftText}
                </div>
              ) : null}
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
                    aria-label="Start microphone capture"
                    onClick={startRecognition}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Mic2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Pause the conversation"
                    onClick={pauseRecognition}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pause className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Retry speaking"
                    onClick={restartListening}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RotateCcw className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="End the conversation"
                    onClick={endSession}
                    disabled={sessionState === "loading" || sessionState === "ending"}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Square className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
                  <Volume2 className="h-4 w-4" strokeWidth={1.8} />
                  <input
                    aria-label="Adjust playback volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(event) => {
                      setVolume(Number(event.target.value));
                    }}
                  />
                  <Play className="h-4 w-4" strokeWidth={1.8} />
                </div>
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
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  当前角色：{session?.selectedRole.name ?? "加载中"}
                </div>
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  连接模式：
                  {session?.providerSession.transport === "doubao"
                    ? " 豆包实时语音"
                    : " 本地语音兜底"}
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-[var(--shadow-float)]">
              <div className="flex items-center gap-2 text-[var(--color-primary)]">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                <span className="text-sm font-medium">Report preview</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--color-body)]">
                对话结束后会生成中文分析报告，聚焦语法、词汇、流利度、发音、声调和表达自然度。
              </p>
              <Button className="mt-6 w-full" onClick={endSession}>
                End session and generate report
              </Button>
            </Card>
          </div>
        </section>
      </PageShell>
    </main>
  );
}
