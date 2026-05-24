import type { ReactNode } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Card, SectionHeading } from "@learn-chinese-ai/ui";
import {
  Activity,
  FileText,
  type LucideIcon,
  LayoutDashboard,
  Settings,
  Shapes,
} from "lucide-react";

const navItems: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/", label: "Metrics", icon: Activity },
  { href: "/scenarios", label: "Scenarios", icon: Shapes },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/system", label: "System", icon: Settings },
];

function Shell({ children }: { children: ReactNode }) {
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
      </aside>
      <main className="p-8">{children}</main>
    </div>
  );
}

function MetricsPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Metrics"
        title="Operational view for voice sessions and reports."
        description="The admin UI shares the same token system as the consumer product, but increases information density for operational work."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["Sessions today", "148"],
          ["Average score", "84"],
          ["Realtime failure rate", "1.8%"],
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
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Daily small talk",
            "Interview self-introduction",
            "Hotel check-in",
            "Business opening",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-surface-soft)] p-4"
            >
              <h3 className="font-semibold text-[var(--color-ink)]">{item}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--color-body)]">
                Prompt structure, opening line, fallback hints, and target difficulty live
                here.
              </p>
            </div>
          ))}
        </div>
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
        <div className="grid gap-3">
          {[
            "conv-002 · finished · score 88",
            "conv-003 · finished · score 79",
            "conv-004 · failed · retry pending",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] px-4 py-3 text-sm text-[var(--color-body)]"
            >
              {item}
            </div>
          ))}
        </div>
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Realtime provider</h3>
            <p className="mt-2 text-sm text-[var(--color-body)]">
              Doubao end-to-end realtime voice
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Prompt template</h3>
            <p className="mt-2 text-sm text-[var(--color-body)]">
              Report summary v1 with fluency and pronunciation emphasis
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<MetricsPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/system" element={<SystemPage />} />
      </Routes>
    </Shell>
  );
}
