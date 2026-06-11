"use client";

import type { PracticeScenario } from "@learn-chinese-ai/shared-types";
import { Badge, Card } from "@learn-chinese-ai/ui";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buildPracticeHref } from "../lib/practice-navigation";
import { useAuth } from "./AuthProvider";

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
  showRoleBadge = true,
  returnTo,
}: ScenarioCardProps) {
  const { status, requireAuth } = useAuth();
  const href = buildPracticeHref({
    scenarioId: scenario.id,
    roleId: scenario.defaultRoleId,
    mode: scenario.mode,
    returnTo,
  });

  return (
    <Card className="group h-full overflow-hidden border-[var(--color-hairline-soft)] bg-white transition-shadow hover:shadow-[var(--shadow-float)]">
      <div className="relative h-48">
        <Image
          src={scenario.cover}
          alt={scenario.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          unoptimized
        />
        {showRoleBadge ? (
          <div className="absolute left-4 top-4">
            <Badge>{scenario.roles[1]?.name ?? "AI role"}</Badge>
          </div>
        ) : null}
      </div>
      <div className="flex h-[calc(100%-12rem)] flex-col space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
          <span>{formatScenarioTypeLabel(scenario.type)}</span>
          <span>•</span>
          <span>{formatDifficultyLabel(scenario.difficulty)}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-[var(--color-ink)]">
            {scenario.title}
          </h3>
          <p className="text-sm leading-6 text-[var(--color-body)]">
            {scenario.subtitle}
          </p>
        </div>
        {showAction ? (
          status === "authenticated" ? (
            <Link
              href={href}
              className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
            >
              Start this practice
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => requireAuth(href)}
              className="mt-auto inline-flex items-center gap-2 text-left text-sm font-medium text-[var(--color-primary)]"
            >
              Start this practice
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </button>
          )
        ) : null}
      </div>
    </Card>
  );
}
