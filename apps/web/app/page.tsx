import { PageShell } from "@learn-chinese-ai/ui";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { HomeFooter } from "../components/HomeFooter";
import { ScenarioCarousel } from "../components/ScenarioCarousel";
import { scenarios } from "../lib/mock-data";

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-5rem)]">
      <PageShell className="flex min-h-[calc(100vh-5rem)] flex-col gap-8 pb-8 pt-12">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-semibold leading-tight text-[var(--color-ink)] md:text-[40px]">
            Realtime conversation themes
          </h1>
        </section>

        <ScenarioCarousel scenarios={scenarios} />

        <section aria-label="Search more conversation themes">
          <Link
            href="/discovery"
            className="group flex w-full items-center justify-between gap-4 rounded-full border border-[var(--color-hairline-soft)] bg-white px-5 py-4 shadow-[var(--shadow-float)] transition-colors hover:bg-[var(--color-surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] md:px-6"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <Search className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="min-w-0 truncate text-base font-semibold text-[var(--color-ink)]">
                Search conversation themes
              </p>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-primary)] transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </span>
          </Link>
        </section>

        <div className="mt-auto">
          <HomeFooter />
        </div>
      </PageShell>
    </main>
  );
}
