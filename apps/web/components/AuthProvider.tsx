"use client";

import type {
  AuthSessionUser,
  LoginWithPasswordRequest,
  RegisterWithPasswordRequest,
  RegisterWithPasswordResponse,
} from "@learn-chinese-ai/shared-types";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getApiBaseUrl } from "../lib/api";
import { clearStoredAccessToken, setStoredAccessToken } from "../lib/auth-storage";

type AuthStatus = "loading" | "authenticated" | "anonymous";
type AuthModalMode = "login" | "register" | null;

/* eslint-disable no-unused-vars */
interface AuthContextValue {
  status: AuthStatus;
  session: AuthSessionUser | null;
  authModalMode: AuthModalMode;
  authNextPath: string | null;
  authNotice: string;
  refreshSession(): Promise<void>;
  openLogin(next?: string): void;
  openRegister(next?: string): void;
  closeAuthModal(): void;
  beginLogin(next?: string): void;
  loginWithPassword(input: LoginWithPasswordRequest): Promise<void>;
  registerWithPassword(
    input: RegisterWithPasswordRequest
  ): Promise<RegisterWithPasswordResponse>;
  requireAuth(next?: string): void;
  dismissNotice(): void;
  logout(): Promise<void>;
}
/* eslint-enable no-unused-vars */

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSessionUser | null>(null);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);
  const [authNextPath, setAuthNextPath] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState("");
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

  function openLogin(next?: string) {
    setAuthNextPath(next && next.startsWith("/") ? next : null);
    setAuthModalMode("login");
  }

  function openRegister(next?: string) {
    setAuthNextPath(next && next.startsWith("/") ? next : null);
    setAuthModalMode("register");
  }

  function closeAuthModal() {
    setAuthModalMode(null);
  }

  function dismissNotice() {
    setAuthNotice("");
  }

  function beginLogin(next?: string) {
    const search = new URLSearchParams();

    if (next) {
      search.set("next", next);
    }

    window.location.href = `${getApiBaseUrl()}/auth/google/start${search.toString() ? `?${search.toString()}` : ""}`;
  }

  async function loginWithPassword(input: LoginWithPasswordRequest) {
    const nextSession = await apiRequest<AuthSessionUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setStoredAccessToken(nextSession.accessToken);
    setSession(nextSession);
    setStatus("authenticated");
    setAuthModalMode(null);
    setAuthNotice("");

    const nextPath = authNextPath && authNextPath.startsWith("/") ? authNextPath : "/";
    setAuthNextPath(null);
    router.push(nextPath);
    router.refresh();
  }

  async function registerWithPassword(input: RegisterWithPasswordRequest) {
    const result = await apiRequest<RegisterWithPasswordResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setAuthModalMode("login");
    setAuthNotice("Registration successful. Please sign in.");
    setAuthNextPath("/");
    router.push("/");
    router.refresh();
    return result;
  }

  function requireAuth(next?: string) {
    setAuthNotice("Please sign in first.");
    openLogin(next);
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
      setAuthNextPath(null);
      setAuthModalMode(null);
      router.push("/");
      router.refresh();
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!authNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAuthNotice("");
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authNotice]);

  return (
    <AuthContext.Provider
      value={{
        status,
        session,
        authModalMode,
        authNextPath,
        authNotice,
        refreshSession,
        openLogin,
        openRegister,
        closeAuthModal,
        beginLogin,
        loginWithPassword,
        registerWithPassword,
        requireAuth,
        dismissNotice,
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
