import { cssVariables } from "@learn-chinese-ai/design-tokens";
import { Mic2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AuthProvider } from "../components/AuthProvider";
import { HeaderAuthActions } from "../components/HeaderAuthActions";
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
              <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-8">
                <Link
                  href="/"
                  className="flex items-center gap-3 text-lg font-semibold text-[var(--color-primary)]"
                >
                  <Mic2 className="h-5 w-5" strokeWidth={2} />
                  <span>Learn Chinese AI</span>
                </Link>
                <SiteNav />
                <HeaderAuthActions />
              </div>
            </header>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
