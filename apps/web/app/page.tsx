import { Badge, Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { ArrowRight, Clock3, Languages, Search, Sparkles, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { scenarios } from "../lib/mock-data";

export default function HomePage() {
  return (
    <main>
      <PageShell className="space-y-16 pb-20">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <Badge className="bg-[var(--color-primary-disabled)] text-[var(--color-primary-active)]">
              Realtime spoken Chinese for overseas learners
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-2xl text-4xl font-bold leading-tight text-[var(--color-ink)] md:text-5xl">
                Practice Chinese with a voice-first tutor that feels natural.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-[var(--color-body)]">
                Start a live conversation, see the transcript update in real time, and
                finish each session with a concise report on grammar, fluency,
                pronunciation, tone, and naturalness.
              </p>
            </div>
            <div className="flex max-w-2xl items-center justify-between rounded-full border border-[var(--color-hairline-soft)] bg-white p-2 shadow-[var(--shadow-float)]">
              <div className="grid flex-1 grid-cols-3 gap-2 px-4">
                <div className="border-r border-[var(--color-hairline-soft)] pr-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Where
                  </p>
                  <p className="text-sm text-[var(--color-ink)]">Daily life</p>
                </div>
                <div className="border-r border-[var(--color-hairline-soft)] px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Goal
                  </p>
                  <p className="text-sm text-[var(--color-ink)]">Sound natural</p>
                </div>
                <div className="px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Focus
                  </p>
                  <p className="text-sm text-[var(--color-ink)]">Pronunciation</p>
                </div>
              </div>
              <Link
                href="/practice?mode=free"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
              >
                <Search className="h-5 w-5" strokeWidth={2} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-soft)] px-4 py-2">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                Scenario-based
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-soft)] px-4 py-2">
                <Waves className="h-4 w-4" strokeWidth={1.8} />
                Voice in and voice out
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-soft)] px-4 py-2">
                <Languages className="h-4 w-4" strokeWidth={1.8} />
                Chinese-first feedback
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {scenarios.slice(0, 4).map((scenario) => (
              <Card
                key={scenario.id}
                className="overflow-hidden border-0 shadow-[var(--shadow-float)]"
              >
                <div className="relative h-56">
                  <Image
                    src={scenario.cover}
                    alt={scenario.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute left-4 top-4">
                    <Badge>{scenario.roles[1]?.name ?? "AI role"}</Badge>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">
                      {scenario.title}
                    </h3>
                    <span className="text-sm text-[var(--color-muted)]">
                      {scenario.difficulty}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[var(--color-body)]">
                    {scenario.subtitle}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Scenarios"
            title="Choose the conversation setting that matches your real-life goal."
            description="Each practice track is designed as a lightweight card. Jump in fast, speak early, and review later."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {scenarios.map((scenario) => (
              <Card
                key={scenario.id}
                className="group overflow-hidden border-[var(--color-hairline-soft)] bg-white transition-shadow hover:shadow-[var(--shadow-float)]"
              >
                <div className="relative h-48">
                  <Image
                    src={scenario.cover}
                    alt={scenario.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    unoptimized
                  />
                </div>
                <div className="space-y-4 p-5">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-[var(--color-ink)]">
                      {scenario.title}
                    </h3>
                    <p className="text-sm leading-6 text-[var(--color-body)]">
                      {scenario.subtitle}
                    </p>
                  </div>
                  <Link
                    href={`/practice?scenarioId=${scenario.id}&roleId=${scenario.defaultRoleId}&mode=scenario`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
                  >
                    Start this practice
                    <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Low-friction entry",
              body: "Jump from a scenario card directly into the practice page with the right role and topic already selected.",
              icon: Clock3,
            },
            {
              title: "Transcript-first review",
              body: "Every practice session leaves behind a clean transcript so users can reread how they actually responded under pressure.",
              icon: Languages,
            },
            {
              title: "Focused feedback",
              body: "Reports stay concise and specific, highlighting grammar, vocabulary, tone, pronunciation, and naturalness.",
              icon: Sparkles,
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-float)]"
            >
              <item.icon
                className="mb-4 h-5 w-5 text-[var(--color-primary)]"
                strokeWidth={1.8}
              />
              <h3 className="mb-3 text-lg font-semibold text-[var(--color-ink)]">
                {item.title}
              </h3>
              <p className="text-sm leading-7 text-[var(--color-body)]">{item.body}</p>
            </Card>
          ))}
        </section>

        <section className="rounded-[32px] bg-[var(--color-surface-soft)] px-6 py-10 md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-[28px] font-bold text-[var(--color-ink)]">
                Ready to start your first voice loop?
              </h2>
              <p className="max-w-2xl text-base leading-7 text-[var(--color-body)]">
                The first version already covers themed entry, live transcript,
                conversation history, and a printable report.
              </p>
            </div>
            <Link href="/practice?mode=free">
              <Button className="w-full md:w-auto">Launch practice</Button>
            </Link>
          </div>
        </section>
      </PageShell>
    </main>
  );
}
