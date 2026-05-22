import * as React from "react";
import { cn } from "../lib/cn";

export function PageShell({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl px-6 py-10 md:px-8 lg:px-10",
        className
      )}
      {...props}
    />
  );
}
