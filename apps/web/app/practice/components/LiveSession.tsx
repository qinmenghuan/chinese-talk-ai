"use client";

import type {
  MessageItem,
  RealtimeSessionResponse,
} from "@learn-chinese-ai/shared-types";
import { Card } from "@learn-chinese-ai/ui";
import { Mic2, Pause, RotateCcw, Square, Waves } from "lucide-react";
import type { RefObject } from "react";
import type { SessionState } from "./PracticeExperience";

interface LiveSessionProps {
  session: RealtimeSessionResponse | null;
  sessionState: SessionState;
  currentStatusLabel: string;
  transcript: MessageItem[];
  errorMessage: string;
  transcriptViewportRef: RefObject<HTMLDivElement | null>;
  transcriptBottomAnchorRef: RefObject<HTMLDivElement | null>;
  onStart(): void;
  onPause(): void;
  onStop(): void;
  onRestart(): void;
}

export function LiveSession({
  session,
  sessionState,
  currentStatusLabel,
  transcript,
  errorMessage,
  transcriptViewportRef,
  transcriptBottomAnchorRef,
  onStart,
  onPause,
  onStop,
  onRestart,
}: LiveSessionProps) {
  return (
    <Card className="flex h-[calc(100vh-13rem)] min-h-[34rem] max-h-[52rem] flex-col overflow-hidden border-0 shadow-[var(--shadow-float)]">
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
              Realtime WebSocket
            </span>
            <span>{currentStatusLabel}</span>
          </div>
        </div>
      </div>

      <div
        ref={transcriptViewportRef}
        className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-soft)] p-6"
      >
        <div className="space-y-4">
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
          <div ref={transcriptBottomAnchorRef} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-auto border-t border-[var(--color-hairline-soft)] bg-white px-6 py-5">
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-full border border-[var(--color-hairline-soft)] bg-white p-2 shadow-[var(--shadow-float)]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="Start realtime conversation"
              onClick={onStart}
              disabled={sessionState === "loading" || sessionState === "ending"}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Mic2 className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Pause microphone capture"
              onClick={onPause}
              disabled={sessionState === "loading" || sessionState === "ending"}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pause className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="Stop realtime conversation"
              onClick={onStop}
              disabled={sessionState !== "recording" && sessionState !== "paused"}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Square className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="Restart the realtime session"
              onClick={onRestart}
              disabled={sessionState === "loading" || sessionState === "ending"}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
