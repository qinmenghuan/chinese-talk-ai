"use client";

import type { PracticeScenario } from "@learn-chinese-ai/shared-types";
import { Badge } from "@learn-chinese-ai/ui";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildPracticeHref } from "../lib/practice-navigation";
import { useAuth } from "./auth/AuthProvider";

interface ScenarioCarouselProps {
  scenarios: PracticeScenario[];
}

function formatDifficultyLabel(value: PracticeScenario["difficulty"]) {
  if (value === "beginner") {
    return "Beginner";
  }

  if (value === "intermediate") {
    return "Intermediate";
  }

  return "Advanced";
}

function formatScenarioTypeLabel(value: PracticeScenario["type"]) {
  if (value === "daily") {
    return "Daily";
  }

  if (value === "interview") {
    return "Interview";
  }

  if (value === "travel") {
    return "Travel";
  }

  return "Business";
}

function getScenarioHref(scenario: PracticeScenario) {
  return buildPracticeHref({
    scenarioId: scenario.id,
    roleId: scenario.defaultRoleId,
    mode: scenario.mode,
  });
}

export function ScenarioCarousel({ scenarios }: ScenarioCarouselProps) {
  const { status, requireAuth } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeScenario = scenarios[activeIndex];

  useEffect(() => {
    if (scenarios.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % scenarios.length);
    }, 4500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [scenarios.length]);

  if (!activeScenario) {
    return null;
  }

  const href = getScenarioHref(activeScenario);
  const slideContent = (
    <>
      {scenarios.map((scenario, index) => (
        <Image
          key={scenario.id}
          src={scenario.cover}
          alt={scenario.title}
          fill
          priority={index === 0}
          sizes="(min-width: 1280px) 1280px, 100vw"
          className={`object-cover transition-opacity duration-700 ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
          unoptimized
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8 lg:p-10">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge className="bg-white text-[var(--color-ink)]">
            {formatDifficultyLabel(activeScenario.difficulty)}
          </Badge>
          <Badge className="bg-white/90 text-[var(--color-ink)]">
            {formatScenarioTypeLabel(activeScenario.type)}
          </Badge>
        </div>
        <h2 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
          {activeScenario.title}
        </h2>
      </div>
    </>
  );

  return (
    <section className="space-y-4" aria-label="Realtime conversation themes">
      <div className="relative h-[31rem] w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-float)] md:h-[38rem] lg:h-[42rem]">
        {status === "authenticated" ? (
          <Link
            href={href}
            className="absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-label={`Practice ${activeScenario.title}`}
          >
            {slideContent}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => requireAuth(href)}
            className="absolute inset-0 block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-label={`Sign in to practice ${activeScenario.title}`}
          >
            {slideContent}
          </button>
        )}
      </div>

      <div className="flex justify-center gap-2">
        {scenarios.map((scenario, index) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === activeIndex
                ? "w-8 bg-[var(--color-primary)]"
                : "w-2.5 bg-[var(--color-hairline)]"
            }`}
            aria-label={`Show ${scenario.title}`}
            aria-current={index === activeIndex ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}
