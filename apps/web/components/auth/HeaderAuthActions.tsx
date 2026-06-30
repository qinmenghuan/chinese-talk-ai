"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@learn-chinese-ai/ui";
import { useAuth } from "./AuthProvider";

export function HeaderAuthActions() {
  const { status, session, openLogin, openRegister, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-2">
      {status === "authenticated" && session ? (
        <div ref={accountMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            {session.user.displayName}
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 top-12 w-64 rounded-3xl border border-[var(--color-hairline-soft)] bg-white p-3 shadow-[var(--shadow-float)]"
              role="menu"
            >
              <p className="break-words px-3 py-2 text-xs text-[var(--color-muted)]">
                {session.user.email}
              </p>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
                role="menuitem"
              >
                <Settings className="h-4 w-4" strokeWidth={1.8} />
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
                className="w-full rounded-2xl px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            shape="pill"
            variant="secondary"
            className="sm:px-4"
            onClick={() =>
              openLogin(
                typeof window === "undefined"
                  ? "/"
                  : `${window.location.pathname}${window.location.search}`
              )
            }
          >
            {status === "loading" ? "Checking..." : "Login"}
          </Button>
          <Button
            type="button"
            shape="pill"
            variant="primary"
            className="sm:px-4"
            onClick={() =>
              openRegister(
                typeof window === "undefined"
                  ? "/"
                  : `${window.location.pathname}${window.location.search}`
              )
            }
          >
            Register
          </Button>
        </div>
      )}
    </div>
  );
}
