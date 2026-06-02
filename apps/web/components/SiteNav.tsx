"use client";

import { cn } from "@learn-chinese-ai/ui";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { isNavItemActive } from "./site-nav.utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/discovery", label: "Discover" },
  { href: "/practice", label: "Practice" },
  { href: "/history", label: "History" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-hairline-soft)] bg-white p-1 shadow-[var(--shadow-float)] md:flex">
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
            )}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
