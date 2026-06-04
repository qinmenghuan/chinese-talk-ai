import type { AdminSessionUser } from "@learn-chinese-ai/shared-types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import {
  clearStoredAdminAccessToken,
  setStoredAdminAccessToken,
} from "../lib/auth-storage";

type AuthStatus = "loading" | "authenticated" | "anonymous";

/* eslint-disable no-unused-vars */
interface AdminAuthContextValue {
  status: AuthStatus;
  session: AdminSessionUser | null;
  refreshSession(): Promise<void>;
  login(...args: [string, string]): Promise<void>;
  logout(): Promise<void>;
}
/* eslint-enable no-unused-vars */

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AdminSessionUser | null>(null);
  const navigate = useNavigate();

  async function refreshSession() {
    try {
      const nextSession = await apiRequest<AdminSessionUser>("/admin/auth/session");
      setStoredAdminAccessToken(nextSession.accessToken);
      setSession(nextSession);
      setStatus("authenticated");
    } catch {
      clearStoredAdminAccessToken();
      setSession(null);
      setStatus("anonymous");
    }
  }

  async function login(username: string, password: string) {
    const nextSession = await apiRequest<AdminSessionUser>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
      }),
    });
    setStoredAdminAccessToken(nextSession.accessToken);
    setSession(nextSession);
    setStatus("authenticated");
    navigate("/");
  }

  async function logout() {
    try {
      await apiRequest("/admin/auth/logout", {
        method: "POST",
      });
    } finally {
      clearStoredAdminAccessToken();
      setSession(null);
      setStatus("anonymous");
      navigate("/login");
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        status,
        session,
        refreshSession,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);

  if (!value) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider.");
  }

  return value;
}
