"use client";

import { Card, PageShell } from "@learn-chinese-ai/ui";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/auth/AuthProvider";

export function LoginCallbackExperience({ nextPath }: { nextPath?: string }) {
  const { refreshSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    void refreshSession().finally(() => {
      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/");
    });
  }, [nextPath, refreshSession, router]);

  return (
    <main>
      <PageShell className="py-16">
        <div className="mx-auto max-w-xl">
          <Card className="p-8 text-sm text-[var(--color-body)] shadow-[var(--shadow-float)]">
            Finishing sign-in...
          </Card>
        </div>
      </PageShell>
    </main>
  );
}
