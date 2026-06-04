import type { ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Card, SectionHeading } from "@learn-chinese-ai/ui";
import {
  Activity,
  FileText,
  type LucideIcon,
  LayoutDashboard,
  Settings,
  Shapes,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAdminAuth } from "./components/AdminAuthProvider";
import { apiRequest } from "./lib/api";
import { UsersPage } from "./features/users/users-page";

const navItems: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/", label: "Metrics", icon: Activity },
  { href: "/users", label: "Users", icon: Users },
  { href: "/scenarios", label: "Scenarios", icon: Shapes },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/system", label: "System", icon: Settings },
];

function Shell({ children }: { children: ReactNode }) {
  const { session, logout } = useAdminAuth();

  return (
    <div
      style={{ minHeight: "100vh", background: "var(--color-canvas)" }}
      className="grid lg:grid-cols-[260px_1fr]"
    >
      <aside className="border-r border-[var(--color-hairline-soft)] bg-white p-6">
        <div className="mb-8 flex items-center gap-3 text-lg font-semibold text-[var(--color-primary)]">
          <LayoutDashboard className="h-5 w-5" strokeWidth={2} />
          <span>Admin Console</span>
        </div>
        <nav className="grid gap-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3 text-sm ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
                }`
              }
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-body)]">
          <p className="font-medium text-[var(--color-ink)]">{session?.admin.username}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 text-sm text-[var(--color-primary)]"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="p-8">{children}</main>
    </div>
  );
}

function LoginPage() {
  const { status, login } = useAdminAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [errorMessage, setErrorMessage] = useState("");

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "var(--color-canvas)" }}
      className="flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-md space-y-5 p-8 shadow-[var(--shadow-float)]">
        <SectionHeading
          eyebrow="Admin Login"
          title="Sign in to the management console"
          description="Use the seeded super admin account to manage users and review system activity."
        />
        <label className="block space-y-2 text-sm text-[var(--color-body)]">
          <span className="font-medium text-[var(--color-ink)]">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)]"
          />
        </label>
        <label className="block space-y-2 text-sm text-[var(--color-body)]">
          <span className="font-medium text-[var(--color-ink)]">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-[var(--color-hairline)] bg-white px-4 py-3 text-[var(--color-ink)]"
          />
        </label>
        {errorMessage ? <p className="text-sm text-[#9f1239]">{errorMessage}</p> : null}
        <button
          type="button"
          onClick={() => {
            setErrorMessage("");
            void login(username, password).catch((error) => {
              setErrorMessage(
                error instanceof Error ? error.message : "Failed to sign in."
              );
            });
          }}
          className="w-full rounded-full bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </Card>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAdminAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="p-8 text-sm text-[var(--color-body)]">Loading admin session...</div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function MetricsPage() {
  const [metrics, setMetrics] = useState<{
    sessionsToday: number;
    averageScore: number;
    realtimeFailureRate: number;
    usersTotal: number;
    disabledUsers: number;
  } | null>(null);

  useEffect(() => {
    void apiRequest<{
      sessionsToday: number;
      averageScore: number;
      realtimeFailureRate: number;
      usersTotal: number;
      disabledUsers: number;
    }>("/admin/metrics").then(setMetrics);
  }, []);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Metrics"
        title="Operational view for voice sessions and users."
        description="The admin UI now includes authenticated access and live user management data from the API."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["Sessions today", `${metrics?.sessionsToday ?? "-"}`],
          ["Average score", `${metrics?.averageScore ?? "-"}`],
          [
            "Realtime failure rate",
            metrics ? `${Math.round(metrics.realtimeFailureRate * 1000) / 10}%` : "-",
          ],
          ["Users total", `${metrics?.usersTotal ?? "-"}`],
          ["Disabled users", `${metrics?.disabledUsers ?? "-"}`],
        ].map(([label, value]) => (
          <Card key={label} className="p-6 shadow-[var(--shadow-float)]">
            <p className="text-sm text-[var(--color-muted)]">{label}</p>
            <p className="mt-3 text-4xl font-bold text-[var(--color-ink)]">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ScenariosPage() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Scenarios"
        title="Scenario cards, prompts, and difficulty settings."
      />
      <Card className="p-6 shadow-[var(--shadow-float)]">
        <p className="text-sm leading-7 text-[var(--color-body)]">
          Scenario management remains scaffolded in this iteration. The main change in
          this release is authenticated admin access and user management.
        </p>
      </Card>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Reports"
        title="Review generated summaries and retry failed jobs."
      />
      <Card className="p-6 shadow-[var(--shadow-float)]">
        <p className="text-sm leading-7 text-[var(--color-body)]">
          Report operations remain scaffolded. Login and user management are now live.
        </p>
      </Card>
    </div>
  );
}

function SystemPage() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="System"
        title="Provider config, prompts, and experiment switches."
      />
      <Card className="p-6 shadow-[var(--shadow-float)]">
        <p className="text-sm leading-7 text-[var(--color-body)]">
          Voice options and learner defaults are now configurable through user settings.
        </p>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Shell>
              <Routes>
                <Route path="/" element={<MetricsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/scenarios" element={<ScenariosPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/system" element={<SystemPage />} />
              </Routes>
            </Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
