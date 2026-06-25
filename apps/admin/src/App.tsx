import type { ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Card, SectionHeading } from "@learn-chinese-ai/ui";
import {
  Activity,
  FileText,
  type LucideIcon,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shapes,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAdminAuth } from "./components/AdminAuthProvider";
import { ConversationsPage } from "./features/conversations/conversations-page";
import { LoginPage } from "./features/login/login-page";
import { ReportsPage } from "./features/reports/reports-page";
import { ScenariosPage } from "./features/scenarios/scenarios-page";
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
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
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
                <Route path="/conversations" element={<ConversationsPage />} />
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
