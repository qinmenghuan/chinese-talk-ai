import { cssVariables } from "@learn-chinese-ai/design-tokens";
import { Globe2, Heart, LayoutDashboard, Mic2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
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
        <div style={cssVariables as CSSProperties}>
          <header className="sticky top-0 z-20 border-b border-[var(--color-hairline-soft)] bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-8">
              <Link
                href="/"
                className="flex items-center gap-3 text-lg font-semibold text-[var(--color-primary)]"
              >
                <Mic2 className="h-5 w-5" strokeWidth={2} />
                <span>Learn Chinese AI</span>
              </Link>
              <SiteNav />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="hidden rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink)] md:inline-flex"
                >
                  Teach me naturally
                </button>
                <button
                  type="button"
                  aria-label="Favorite this app"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white"
                >
                  <Heart className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  aria-label="Change language"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white"
                >
                  <Globe2 className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <Link
                  href="http://localhost:5173"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white"
                >
                  <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
                </Link>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
