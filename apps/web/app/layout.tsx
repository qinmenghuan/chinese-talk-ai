import { cssVariables } from "@learn-chinese-ai/design-tokens";
import { AudioLines, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AuthModal } from "../components/auth/AuthModal";
import { AuthProvider } from "../components/auth/AuthProvider";
import { HeaderAuthActions } from "../components/auth/HeaderAuthActions";
import { SiteNav } from "../components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learn Chinese AI",
  description: "Realtime spoken Chinese practice for overseas learners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div style={cssVariables as CSSProperties}>
            <header className="sticky top-0 z-20 border-b border-[var(--color-hairline-soft)] bg-white/95 backdrop-blur">
              <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-6 md:grid-cols-[1fr_auto_1fr] md:px-8">
                <Link
                  href="/"
                  className="flex min-w-0 items-center gap-3 text-lg font-semibold text-[var(--color-ink)]"
                >
                  <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-hairline-soft)] bg-white text-[var(--color-primary)] shadow-[var(--shadow-float)]">
                    <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                    <AudioLines
                      className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white text-[var(--color-primary)]"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="truncate">Learn Chinese AI</span>
                </Link>
                <SiteNav />
                <div className="justify-self-end">
                  <HeaderAuthActions />
                </div>
              </div>
            </header>
            {children}
            <AuthModal />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
