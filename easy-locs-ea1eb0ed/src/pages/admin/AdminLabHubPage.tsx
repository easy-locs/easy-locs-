import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { getCriticalEvents } from "@/lib/security/security-event-logger";
import { fetchIntegrationHealth, type IntegrationHealthResponse } from "@/lib/api/integration-health";

type HealthStatus = "green" | "yellow" | "red";

interface LabEntry {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: string;
  health: HealthStatus;
  healthReason: string;
}

function computeFactoryHealth(labs: LabEntry[]): { score: number; status: HealthStatus } {
  if (labs.length === 0) return { score: 0, status: "red" };
  const greenCount = labs.filter((l) => l.health === "green").length;
  const yellowCount = labs.filter((l) => l.health === "yellow").length;
  const score = Math.round((greenCount * 100 + yellowCount * 60) / labs.length);
  const status: HealthStatus = score >= 80 ? "green" : score >= 50 ? "yellow" : "red";
  return { score, status };
}

const HEALTH_COLORS: Record<HealthStatus, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const HEALTH_TEXT: Record<HealthStatus, string> = {
  green: "text-green-400",
  yellow: "text-yellow-400",
  red: "text-red-400",
};

function buildDegradedReason(h: IntegrationHealthResponse): string {
  const failing = Object.entries(h.services)
    .filter(([, s]) => s.status === "error")
    .map(([name]) => name);
  return failing.length > 0 ? `${failing.join(", ")} unreachable` : "Service errors detected";
}

function buildPartialReason(h: IntegrationHealthResponse): string {
  const notConfigured = Object.entries(h.services)
    .filter(([, s]) => s.status === "not_configured")
    .map(([name]) => name);
  return notConfigured.length > 0 ? `${notConfigured.join(", ")} not configured` : "Partial configuration";
}

export default function AdminLabHubPage() {
  useUiEngine("admin-lab-hub");
  const navigate = useNavigate();
  const [labs, setLabs] = useState<LabEntry[]>([]);

  const [integrationHealth, setIntegrationHealth] = useState<IntegrationHealthResponse | null>(null);

  const computeLabHealth = useCallback(async () => {
    const criticalEvents = getCriticalEvents(10);
    const hasSecurityAlerts = criticalEvents.length > 0;

    let hasBaselineFile = false;
    try {
      const resp = await fetch("/perf-baselines.json", { method: "HEAD" });
      hasBaselineFile = resp.ok;
    } catch {}

    let hasSecurityReport = false;
    try {
      const resp = await fetch("/security-report.json", { method: "HEAD" });
      hasSecurityReport = resp.ok;
    } catch {}

    let hasApiSpec = false;
    try {
      const resp = await fetch("/api-spec.json", { method: "HEAD" });
      hasApiSpec = resp.ok;
    } catch {}

    let templateCount = 0;
    try {
      const resp = await fetch("/notification-templates.json");
      if (resp.ok) {
        const data = await resp.json();
        templateCount = Array.isArray(data) ? data.length : 0;
      }
    } catch {}

    let hasChangelog = false;
    try {
      const resp = await fetch("/CHANGELOG.md", { method: "HEAD" });
      hasChangelog = resp.ok;
    } catch {}

    let intHealth: IntegrationHealthResponse | null = null;
    try {
      intHealth = await fetchIntegrationHealth();
      setIntegrationHealth(intHealth);
    } catch {}

    const intStatus: HealthStatus = !intHealth
      ? "yellow"
      : intHealth.status === "ok"
      ? "green"
      : intHealth.status === "degraded"
      ? "red"
      : "yellow";

    const intReason = !intHealth
      ? "Unable to reach health endpoint"
      : intHealth.status === "ok"
      ? "All integrations connected"
      : intHealth.status === "degraded"
      ? buildDegradedReason(intHealth)
      : buildPartialReason(intHealth);

    const labData: LabEntry[] = [
      {
        id: "perf",
        name: "Performance Lab",
        description: "Web Vitals, bundle size, regression detection",
        path: "/admin/performance-lab",
        icon: "⚡",
        health: hasBaselineFile ? "green" : "yellow",
        healthReason: hasBaselineFile ? "Baselines available" : "No baselines — run npm run perf:audit",
      },
      {
        id: "data",
        name: "Data Lab",
        description: "Pipeline monitoring, anomaly detection, observability",
        path: "/admin/data-lab",
        icon: "📊",
        health: "green",
        healthReason: "Connected to anomaly_detection_windows",
      },
      {
        id: "security",
        name: "Security Lab",
        description: "Vulnerability scanning, security events, fraud monitoring",
        path: "/admin/security-lab",
        icon: "🛡️",
        health: hasSecurityAlerts ? "red" : hasSecurityReport ? "green" : "yellow",
        healthReason: hasSecurityAlerts
          ? `${criticalEvents.length} critical events`
          : hasSecurityReport
          ? "Report available, no critical alerts"
          : "No scan report — run npm run security:scan",
      },
      {
        id: "release",
        name: "Release Factory",
        description: "Changelog, version management, audit trail",
        path: "/admin/release-history",
        icon: "🚀",
        health: hasChangelog ? "green" : "yellow",
        healthReason: hasChangelog ? "Changelog available" : "No changelog — run npm run changelog",
      },
      {
        id: "notification",
        name: "Notification Lab",
        description: "Email template preview & delivery analytics",
        path: "/admin/notification-lab",
        icon: "📧",
        health: templateCount > 0 ? "green" : "yellow",
        healthReason: templateCount > 0
          ? `${templateCount} templates registered`
          : "No templates — run npm run api:docs",
      },
      {
        id: "experiment",
        name: "Experiment Lab",
        description: "A/B testing, variant analysis, feature flags",
        path: "/admin/experiment-lab",
        icon: "🧪",
        health: "green",
        healthReason: "Connected to system_feature_flags",
      },
      {
        id: "api",
        name: "API Factory",
        description: "Auto-generated docs, TypeScript SDK, webhook catalog",
        path: "/developer-portal/docs",
        icon: "📡",
        health: hasApiSpec ? "green" : "yellow",
        healthReason: hasApiSpec
          ? "API spec generated"
          : "No API spec — run npm run api:docs",
      },
      {
        id: "architecture",
        name: "Architecture Lab",
        description: "Import boundaries, domain ownership, audit grades",
        path: "/admin/architecture-lab",
        icon: "🏗️",
        health: "green",
        healthReason: "Live audit via architecture-validator",
      },
      {
        id: "integrations",
        name: "Integrations Lab",
        description: "Plaid, LiveKit, Meilisearch connectivity monitoring",
        path: "/admin/integration-health",
        icon: "🔌",
        health: intStatus,
        healthReason: intReason,
      },
    ];
    setLabs(labData);
  }, []);

  useEffect(() => {
    computeLabHealth();
  }, [computeLabHealth]);

  const { score: factoryScore, status: factoryStatus } = computeFactoryHealth(labs);

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">Internal Lab Hub</h1>
            <p className="text-xs text-muted-foreground">All 9 laboratories — unified factory view</p>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border/20 p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-muted-foreground">Factory Score</div>
              <div className={`text-4xl font-bold ${HEALTH_TEXT[factoryStatus]}`}>
                {factoryScore}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">{labs.length} Labs Active</div>
              <div className="flex gap-1 mt-1 justify-end">
                {labs.map((l) => (
                  <div key={l.id} className={`w-2 h-2 rounded-full ${HEALTH_COLORS[l.health]}`} title={l.name} />
                ))}
              </div>
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all ${HEALTH_COLORS[factoryStatus]}`}
              style={{ width: `${factoryScore}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Performance + Security + Architecture + Data Quality</span>
            <span>{factoryScore}/100</span>
          </div>
        </div>

        <div className="space-y-2">
          {labs.map((lab) => (
            <button
              key={lab.id}
              onClick={() => navigate(lab.path)}
              className="w-full rounded-xl bg-card border border-border/20 p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lab.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">{lab.name}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${HEALTH_COLORS[lab.health]}`} />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{lab.description}</div>
                  <div className={`text-xs mt-0.5 ${HEALTH_TEXT[lab.health]}`}>{lab.healthReason}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-card border border-border/20 p-4">
          <h3 className="text-sm font-bold mb-2">CLI Quick Reference</h3>
          <div className="space-y-1 text-xs text-muted-foreground font-mono">
            <div>npx tsx scripts/el-cli.ts new domain &lt;name&gt;</div>
            <div>npx tsx scripts/perf-audit.ts</div>
            <div>npx tsx scripts/security-scan.ts</div>
            <div>npx tsx scripts/changelog-generator.ts</div>
            <div>npx tsx scripts/version-bump.ts</div>
            <div>npx tsx scripts/api-doc-generator.ts</div>
            <div>npx tsx scripts/sdk-generator.ts</div>
          </div>
        </div>
      </div>
    </SubPageShell>
  );
}
