"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { cssVariables } from "@learn-chinese-ai/design-tokens";

export function DesignTokenProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const root = document.documentElement;

    for (const [name, value] of Object.entries(cssVariables)) {
      root.style.setProperty(name, value);
    }
  }, []);

  return <>{children}</>;
}
