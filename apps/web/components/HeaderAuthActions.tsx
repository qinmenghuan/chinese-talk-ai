"use client";

import Link from "next/link";
import { Globe2, Heart, LayoutDashboard, Settings } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function HeaderAuthActions() {
  const { status, session, openLogin, openRegister, logout } = useAuth();

  return (
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
      {status === "authenticated" && session ? (
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)]">
            {session.user.displayName}
          </summary>
          <div className="absolute right-0 top-12 w-52 rounded-3xl border border-[var(--color-hairline-soft)] bg-white p-3 shadow-[var(--shadow-float)]">
            <p className="px-3 py-2 text-xs text-[var(--color-muted)]">
              {session.user.email}
            </p>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
            >
              <Settings className="h-4 w-4" strokeWidth={1.8} />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full rounded-2xl px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
            >
              Sign out
            </button>
          </div>
        </details>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              openLogin(
                typeof window === "undefined"
                  ? "/"
                  : `${window.location.pathname}${window.location.search}`
              )
            }
            className="rounded-full border border-[var(--color-hairline)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
          >
            {status === "loading" ? "Checking..." : "Login"}
          </button>
          <button
            type="button"
            onClick={() =>
              openRegister(
                typeof window === "undefined"
                  ? "/"
                  : `${window.location.pathname}${window.location.search}`
              )
            }
            className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            Register
          </button>
        </div>
      )}
    </div>
  );
}
