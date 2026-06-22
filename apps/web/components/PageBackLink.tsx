import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageBackLinkProps {
  href: string;
  label: string;
}

export function PageBackLink({ href, label }: PageBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
      {label}
    </Link>
  );
}
