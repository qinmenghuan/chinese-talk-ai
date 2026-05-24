import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { Mic2, Pause, Play, Sparkles, Volume2, Waves } from "lucide-react";

const transcript = [
  {
    role: "assistant",
    content: "你好，欢迎来到今天的练习。我们先做一个简单的自我介绍，好吗？",
  },
  {
    role: "user",
    content: "你好，我叫 Anna。我现在在美国读大学，我想多练习中文口语。",
  },
  {
    role: "assistant",
    content: "很好。你刚才表达得很清楚。接下来请你介绍一下，你为什么想学中文？",
  },
] as const;

export default function PracticePage() {
  return (
    <main>
      <PageShell className="space-y-10">
        <SectionHeading
          eyebrow="Practice"
          title="A voice-first session page with transcript and session status."
          description="This is the shell for the realtime conversation experience. The layout prioritizes one central panel, a soft control bar, and a compact side summary instead of dashboard clutter."
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
                    Business meeting opener
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-soft)] px-3 py-2">
                    <Waves className="h-4 w-4" strokeWidth={1.8} />
                    Doubao realtime connected
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-[var(--color-surface-soft)] p-6">
              {transcript.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`max-w-[85%] rounded-[var(--radius-card)] px-5 py-4 text-sm leading-7 ${
                    item.role === "assistant"
                      ? "bg-white text-[var(--color-ink)]"
                      : "ml-auto bg-[var(--color-primary)] text-white"
                  }`}
                >
                  {item.content}
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--color-hairline-soft)] bg-white px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-[var(--color-hairline-soft)] bg-white p-2 shadow-[var(--shadow-float)]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Start microphone capture"
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
                  >
                    <Mic2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Pause the conversation"
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)]"
                  >
                    <Pause className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Toggle audio playback"
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-ink)]"
                  >
                    <Volume2 className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <Play className="h-4 w-4" strokeWidth={1.8} />
                  09:42 in progress
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
                Keep transitions natural
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-body)]">
                The side rail stays light. It should support the conversation, not compete
                with it.
              </p>
              <div className="mt-5 space-y-3 text-sm text-[var(--color-body)]">
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  Try softer transition phrases before giving examples.
                </div>
                <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
                  Watch your retroflex sounds in long sentences.
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-[var(--shadow-float)]">
              <div className="flex items-center gap-2 text-[var(--color-primary)]">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                <span className="text-sm font-medium">Report preview</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--color-body)]">
                Once the session ends, this area becomes the bridge into the report view,
                carrying only the strongest summary and next action.
              </p>
              <Button className="mt-6 w-full">End session and generate report</Button>
            </Card>
          </div>
        </section>
      </PageShell>
    </main>
  );
}
