"use client";

import { useEffect, useState } from "react";
import { Toast } from "./Toast";

const footerLinks = [
  "About",
  "Learning guide",
  "Voice practice",
  "Privacy",
  "Terms",
] as const;

export function HomeFooter() {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice("");
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  return (
    <footer className="relative border-t border-[var(--color-hairline-soft)] pt-4">
      <div className="flex min-h-8 flex-col justify-center gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm leading-5">
          {footerLinks.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setNotice("Coming soon")}
              className="inline-flex h-5 items-center text-[var(--color-body)] transition-colors hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="flex h-5 items-center text-sm leading-5 text-[var(--color-muted)]">
          © 2026 Learn Chinese AI
        </p>
      </div>

      <Toast message={notice} />
    </footer>
  );
}
