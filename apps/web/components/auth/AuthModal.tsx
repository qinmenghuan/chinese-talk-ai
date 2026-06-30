"use client";

import { Button, Card } from "@learn-chinese-ai/ui";
import { X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function AuthModal() {
  const {
    authModalMode,
    authNotice,
    authNextPath,
    openLogin,
    openRegister,
    closeAuthModal,
    beginLogin,
    loginWithPassword,
    registerWithPassword,
    dismissNotice,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isOpen = authModalMode !== null;
  const isLogin = authModalMode === "login";

  function resetForm() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSubmitting(false);
    setErrorMessage("");
  }

  function handleClose() {
    resetForm();
    closeAuthModal();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMessage("");

    try {
      if (isLogin) {
        await loginWithPassword({
          email,
          password,
        });
        resetForm();
        return;
      }

      await registerWithPassword({
        email,
        password,
        confirmPassword,
      });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {authNotice ? (
        <div className="fixed right-4 top-24 z-50 max-w-sm">
          <Card className="flex items-start gap-3 border border-[var(--color-hairline-soft)] bg-white p-4 shadow-[var(--shadow-float)]">
            <p className="flex-1 text-sm text-[var(--color-ink)]">{authNotice}</p>
            <button
              type="button"
              onClick={dismissNotice}
              className="text-[var(--color-muted)]"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </Card>
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4">
          <Card className="relative w-full max-w-md border-0 bg-white p-6 shadow-[var(--shadow-float)]">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close sign-in dialog"
              className="absolute right-4 top-4 text-[var(--color-muted)]"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Account
              </p>
              <h2 className="text-2xl font-semibold text-[var(--color-ink)]">
                {isLogin ? "Sign in" : "Create account"}
              </h2>
              <p className="text-sm leading-6 text-[var(--color-body)]">
                {isLogin
                  ? "Use your email and password, or continue with Google."
                  : "Create an account to unlock practice, history, reports, and settings."}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2 text-sm text-[var(--color-body)]">
                <span className="font-medium text-[var(--color-ink)]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                  autoComplete="email"
                />
              </label>

              <label className="block space-y-2 text-sm text-[var(--color-body)]">
                <span className="font-medium text-[var(--color-ink)]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </label>

              {!isLogin ? (
                <label className="block space-y-2 text-sm text-[var(--color-body)]">
                  <span className="font-medium text-[var(--color-ink)]">
                    Confirm password
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                    autoComplete="new-password"
                  />
                </label>
              ) : null}

              {errorMessage ? (
                <p className="text-sm text-[#9f1239]">{errorMessage}</p>
              ) : null}

              <Button
                className="w-full"
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting
                  ? isLogin
                    ? "Signing in..."
                    : "Registering..."
                  : isLogin
                    ? "Sign in"
                    : "Register"}
              </Button>

              {isLogin ? (
                <>
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    <span className="h-px flex-1 bg-[var(--color-hairline-soft)]" />
                    or
                    <span className="h-px flex-1 bg-[var(--color-hairline-soft)]" />
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => beginLogin(authNextPath ?? "/")}
                  >
                    Continue with Google
                  </Button>
                </>
              ) : null}
            </div>

            <div className="mt-5 text-sm text-[var(--color-body)]">
              {isLogin ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    openRegister(authNextPath ?? undefined);
                  }}
                  className="font-medium text-[var(--color-primary)]"
                >
                  Don't have an account? Register
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    openLogin(authNextPath ?? undefined);
                  }}
                  className="font-medium text-[var(--color-primary)]"
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
