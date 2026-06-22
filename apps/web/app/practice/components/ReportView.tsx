"use client";

import { Button, Card } from "@learn-chinese-ai/ui";
import { Sparkles } from "lucide-react";
import type { SessionState } from "./PracticeExperience";

interface ReportViewProps {
  sessionState: SessionState;
  onEndSession(): void;
}

export function ReportView({ sessionState, onEndSession }: ReportViewProps) {
  return (
    <Card className="p-6 shadow-[var(--shadow-float)]">
      <div className="flex items-center gap-2 text-[var(--color-primary)]">
        <Sparkles className="h-4 w-4" strokeWidth={1.8} />
        <span className="text-sm font-medium">Report preview</span>
      </div>
      <p className="mt-4 text-sm leading-7 text-[var(--color-body)]">
        Once the session ends, the transcript is persisted to PostgreSQL and a structured
        report is generated from the saved dialogue.
      </p>
      <Button
        className="mt-6 w-full"
        onClick={onEndSession}
        disabled={
          sessionState === "loading" ||
          sessionState === "ending" ||
          sessionState === "stopped"
        }
      >
        End session and generate report
      </Button>
    </Card>
  );
}
