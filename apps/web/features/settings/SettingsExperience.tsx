"use client";

import type { UserPreference, VoiceOption } from "@learn-chinese-ai/shared-types";
import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/auth/AuthProvider";
import { getCurrentPath } from "../../lib/auth-guard";
import { apiRequest } from "../../lib/api";

interface ProfileResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  preference: UserPreference;
}

export function SettingsExperience() {
  const { status, requireAuth, refreshSession } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [preference, setPreference] = useState<UserPreference>({
    proficiencyLevel: "beginner",
    learningGoal: "daily",
    preferredVoiceId: "friendly-female",
  });
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const requestAuth = useEffectEvent(() => {
    requireAuth(getCurrentPath("/settings"));
  });

  useEffect(() => {
    if (status === "anonymous") {
      requestAuth();
    }
  }, [requestAuth, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    void (async () => {
      const [profile, voiceOptions] = await Promise.all([
        apiRequest<ProfileResponse>("/me/profile"),
        apiRequest<VoiceOption[]>("/system-config/voices"),
      ]);

      setDisplayName(profile.user.displayName);
      setPreference(profile.preference);
      setVoices(voiceOptions);
    })().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load settings.");
    });
  }, [status]);

  if (status !== "authenticated") {
    return (
      <main>
        <PageShell className="py-16">
          <Card className="p-6 text-sm text-[var(--color-body)]">
            Redirecting to sign in...
          </Card>
        </PageShell>
      </main>
    );
  }

  return (
    <main>
      <PageShell className="space-y-8 py-10">
        <SectionHeading
          eyebrow="Settings"
          title="Personal learning preferences"
          description="Set your preferred level, learning goal, and Doubao voice so each practice session starts closer to your default style."
        />
        <Card className="space-y-5 p-6 shadow-[var(--shadow-float)]">
          <label className="grid gap-3 text-sm text-[var(--color-body)] md:grid-cols-[12rem_1fr] md:items-center">
            <span className="font-medium text-[var(--color-ink)]">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)]"
            />
          </label>
          <label className="grid gap-3 text-sm text-[var(--color-body)] md:grid-cols-[12rem_1fr] md:items-center">
            <span className="font-medium text-[var(--color-ink)]">Level</span>
            <select
              value={preference.proficiencyLevel}
              onChange={(event) =>
                setPreference((current) => ({
                  ...current,
                  proficiencyLevel: event.target
                    .value as UserPreference["proficiencyLevel"],
                }))
              }
              className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)]"
            >
              <option value="beginner">Low</option>
              <option value="intermediate">Medium</option>
              <option value="advanced">High</option>
            </select>
          </label>
          <label className="grid gap-3 text-sm text-[var(--color-body)] md:grid-cols-[12rem_1fr] md:items-center">
            <span className="font-medium text-[var(--color-ink)]">Learning goal</span>
            <select
              value={preference.learningGoal}
              onChange={(event) =>
                setPreference((current) => ({
                  ...current,
                  learningGoal: event.target.value as UserPreference["learningGoal"],
                }))
              }
              className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)]"
            >
              <option value="daily">Daily</option>
              <option value="interview">Interview</option>
              <option value="travel">Travel</option>
              <option value="business">Business</option>
            </select>
          </label>
          <label className="grid gap-3 text-sm text-[var(--color-body)] md:grid-cols-[12rem_1fr] md:items-center">
            <span className="font-medium text-[var(--color-ink)]">
              Preferred Doubao voice
            </span>
            <select
              value={preference.preferredVoiceId ?? ""}
              onChange={(event) =>
                setPreference((current) => ({
                  ...current,
                  preferredVoiceId: event.target.value || null,
                }))
              }
              className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)]"
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.label}
                </option>
              ))}
            </select>
          </label>
          {message ? <p className="text-sm text-[var(--color-body)]">{message}</p> : null}
          <div className="flex justify-end">
            <Button
              disabled={saving}
              onClick={() => {
                setSaving(true);
                setMessage("");

                void apiRequest<ProfileResponse>("/me/profile", {
                  method: "PUT",
                  body: JSON.stringify({
                    displayName,
                    ...preference,
                  }),
                }).then(
                  async () => {
                    setSaving(false);
                    setMessage("Settings saved.");
                    await refreshSession();
                    router.refresh();
                  },
                  (error) => {
                    setSaving(false);
                    setMessage(
                      error instanceof Error ? error.message : "Failed to save settings."
                    );
                  }
                );
              }}
            >
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </Card>
      </PageShell>
    </main>
  );
}
