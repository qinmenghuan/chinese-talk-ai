"use client";

import type { PracticeScenario } from "@learn-chinese-ai/shared-types";
import { Badge, cn } from "@learn-chinese-ai/ui";
import Image from "next/image";
import Link from "next/link";
import { buildPracticeHref } from "../lib/practice-navigation";
import { useAuth } from "./auth/AuthProvider";

interface ScenarioCardProps {
  scenario: PracticeScenario;
  showAction?: boolean;
  showRoleBadge?: boolean;
  returnTo?: string;
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

export function ScenarioCard({
  scenario,
  showAction = true,
  showRoleBadge = false,
  returnTo,
}: ScenarioCardProps) {
  const { status, requireAuth } = useAuth();
  const href = buildPracticeHref({
    scenarioId: scenario.id,
    roleId: scenario.defaultRoleId,
    mode: scenario.mode,
    returnTo,
  });
  const cardClassName =
    "group block h-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-white text-left transition-shadow hover:shadow-[var(--shadow-float)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";
  const content = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={scenario.cover}
          alt={scenario.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
          unoptimized
        />
        <div className="absolute left-4 top-4">
          <Badge className="bg-white/95 text-[var(--color-ink)] shadow-[var(--shadow-float)]">
            {formatDifficultyLabel(scenario.difficulty)}
          </Badge>
        </div>
        {showRoleBadge ? (
          <div className="absolute bottom-4 left-4">
            <Badge className="bg-white/90 text-[var(--color-muted)]">
              {formatScenarioTypeLabel(scenario.type)}
            </Badge>
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
          {formatScenarioTypeLabel(scenario.type)}
        </p>
        <h3 className="text-base font-semibold text-[var(--color-ink)]">
          {scenario.title}
        </h3>
        <p className="text-sm leading-6 text-[var(--color-body)]">{scenario.subtitle}</p>
      </div>
    </>
  );

  if (!showAction) {
    return <div className={cn(cardClassName, "cursor-default")}>{content}</div>;
  }

  if (status === "authenticated") {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => requireAuth(href)} className={cardClassName}>
      {content}
    </button>
  );
}
