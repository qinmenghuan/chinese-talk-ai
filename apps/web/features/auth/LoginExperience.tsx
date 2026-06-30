"use client";

import { Button, Card, PageShell, SectionHeading } from "@learn-chinese-ai/ui";
import { useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/auth/AuthProvider";

export function LoginExperience({ nextPath }: { nextPath?: string }) {
  const { status, openLogin, openRegister } = useAuth();
  const router = useRouter();
  // 中文注释：定义一个事件处理函数，用于启动登录流程
  const launchLogin = useEffectEvent(() => {
    openLogin(nextPath && nextPath.startsWith("/") ? nextPath : "/");
  });

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/");
      return;
    }

    if (status === "anonymous") {
      launchLogin();
    }
  }, [launchLogin, nextPath, router, status]);

  return (
    <main>
      <PageShell className="py-16">
        <div className="mx-auto max-w-xl">
          <Card className="space-y-6 p-8 shadow-[var(--shadow-float)]">
            <SectionHeading
              eyebrow="Login"
              title="Sign in to continue your Chinese practice"
              description="Use email and password or Google to unlock realtime practice, conversation history, report viewing, and personal learning settings."
            />
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() =>
                  openLogin(nextPath && nextPath.startsWith("/") ? nextPath : "/")
                }
              >
                Open sign in
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() =>
                  openRegister(nextPath && nextPath.startsWith("/") ? nextPath : "/")
                }
              >
                Register
              </Button>
            </div>
          </Card>
        </div>
      </PageShell>
    </main>
  );
}
