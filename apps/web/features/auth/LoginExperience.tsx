"use client";

import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";

export function LoginExperience({ nextPath }: { nextPath?: string }) {
  const { status, beginLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/");
    }
  }, [nextPath, router, status]);

  return (
    <main>
      <PageShell className="py-16">
        <div className="mx-auto max-w-xl">
          <Card className="space-y-6 p-8 shadow-[var(--shadow-float)]">
            <SectionHeading
              eyebrow="Login"
              title="Sign in to continue your Chinese practice"
              description="Use Google to unlock realtime practice, conversation history, report viewing, and personal learning settings."
            />
            <Button
              className="w-full"
              onClick={() =>
                beginLogin(nextPath && nextPath.startsWith("/") ? nextPath : "/")
              }
            >
              Continue with Google
            </Button>
          </Card>
        </div>
      </PageShell>
    </main>
  );
}
