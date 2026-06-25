import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Card } from "@learn-chinese-ai/ui";
import { ArrowRight } from "lucide-react";
import { useAdminAuth } from "../../components/AdminAuthProvider";

const ADMIN_LOGIN_BACKGROUND_URL =
  "https://images.pexels.com/photos/3874031/pexels-photo-3874031.jpeg?auto=compress&cs=tinysrgb&w=1600";

export function LoginPage() {
  const { status, login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();

  const redirectTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "object" &&
    location.state.from !== null &&
    "pathname" in location.state.from &&
    typeof location.state.from.pathname === "string"
      ? location.state.from.pathname
      : "/";

  if (status === "authenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign in.");
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div
        className="admin-login-page"
        style={{ backgroundImage: `url(${ADMIN_LOGIN_BACKGROUND_URL})` }}
      >
        <div className="admin-login-loading">
          <Card className="admin-login-loading__card">
            <p className="admin-login-loading__eyebrow">Admin Console</p>
            <h1 className="admin-login-loading__title">Checking access...</h1>
            <p className="admin-login-loading__body">Preparing your workspace.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-login-page"
      style={{ backgroundImage: `url(${ADMIN_LOGIN_BACKGROUND_URL})` }}
    >
      <div className="admin-login-shell">
        <Card className="admin-login-panel">
          <div className="space-y-3 mb-6">
            <h2 className="admin-login-panel__title">Mandarin AI Practice Admin </h2>
          </div>

          <form
            className="admin-login-form"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <label className="admin-login-field">
              <span className="admin-login-field__label">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="admin-login-input"
                autoComplete="username"
                required
              />
            </label>
            <label className="admin-login-field">
              <span className="admin-login-field__label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="admin-login-input"
                autoComplete="current-password"
                required
              />
            </label>

            {errorMessage ? <p className="admin-login-error">{errorMessage}</p> : null}

            <button type="submit" className="admin-login-submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
