"use client";

import type { AuthSessionUser } from "@learn-chinese-ai/shared-types";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getApiBaseUrl } from "../lib/api";
import { clearStoredAccessToken, setStoredAccessToken } from "../lib/auth-storage";

type AuthStatus = "loading" | "authenticated" | "anonymous";

/* eslint-disable no-unused-vars */
interface AuthContextValue {
  status: AuthStatus;
  session: AuthSessionUser | null;
  refreshSession(): Promise<void>;
  beginLogin(next?: string): void;
  logout(): Promise<void>;
}
/* eslint-enable no-unused-vars */

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSessionUser | null>(null);
  const router = useRouter();

  async function refreshSession() {
    try {
      const nextSession = await apiRequest<AuthSessionUser>("/auth/session");
      setStoredAccessToken(nextSession.accessToken);
      setSession(nextSession);
      setStatus("authenticated");
    } catch {
      clearStoredAccessToken();
      setSession(null);
      setStatus("anonymous");
    }
  }

  function beginLogin(next?: string) {
    const search = new URLSearchParams();

    if (next) {
      search.set("next", next);
    }

    window.location.href = `${getApiBaseUrl()}/auth/google/start${search.toString() ? `?${search.toString()}` : ""}`;
  }

  async function logout() {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
      });
    } finally {
      clearStoredAccessToken();
      setSession(null);
      setStatus("anonymous");
      router.push("/");
      router.refresh();
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        session,
        refreshSession,
        beginLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
