"use client";

import { cn } from "@learn-chinese-ai/ui";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { isNavItemActive } from "./site-nav.utils";
import { useAuth } from "./auth/AuthProvider";

const navItems = [
  { href: "/", label: "Home", requiresAuth: false },
  { href: "/discovery", label: "Discover", requiresAuth: false },
  { href: "/practice", label: "Practice", requiresAuth: true },
  { href: "/history", label: "History", requiresAuth: true },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const { status, requireAuth } = useAuth();

  return (
    <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-hairline-soft)] bg-white p-1 shadow-[var(--shadow-float)] md:flex">
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);
        const className = cn(
          "rounded-full px-4 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-[var(--color-primary)] !text-white"
            : "text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
        );

        if (item.requiresAuth && status !== "authenticated") {
          return (
            <button
              key={item.href}
              type="button"
              className={className}
              aria-current={isActive ? "page" : undefined}
              onClick={() => requireAuth(item.href)}
            >
              {item.label}
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            className={className}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
