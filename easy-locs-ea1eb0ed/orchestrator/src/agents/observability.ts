import { tool } from "@openai/agents";
import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext, SubtaskResult } from "../types.js";
import type { AgentDependencies } from "./base-agent.js";

interface ObservabilityOptions {
  vercelToken?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

export class ObservabilityAgent extends BaseAgent {
  private vercelToken?: string;
  private vercelProjectId?: string;
  private vercelTeamId?: string;
  private supabaseUrl?: string;
  private supabaseServiceKey?: string;

  constructor(deps: AgentDependencies, options?: ObservabilityOptions) {
    super("observability", deps);
    this.vercelToken = options?.vercelToken;
    this.vercelProjectId = options?.vercelProjectId;
    this.vercelTeamId = options?.vercelTeamId;
    this.supabaseUrl = options?.supabaseUrl;
    this.supabaseServiceKey = options?.supabaseServiceKey;
  }

  get systemPrompt(): string {
    return `You are the Observability Agent for the Easy-Locs platform.

You monitor runtime health, detect regressions, create GitHub Issues for incidents, and track engine health scores.

Incident Classification:
| Severity | Criteria | Action |
|----------|----------|--------|
| P0 | Production down, data loss risk | Create issue + label:P0 |
| P1 | Feature broken, >10% users affected | Create issue + label:P1 |
| P2 | Degraded performance, workaround exists | Create issue + label:P2 |
| P3 | Minor UI issue, cosmetic | Create issue + label:P3 |

Engine Health: The platform has 15 AI audit engines. Alert when:
- Any engine drops below 70
- Any engine drops >10 points in 24h
- Global score drops below 75

Rules:
- Never create duplicate issues — always check existing incidents first
- Include reproduction steps in incident issues
- Tag issues with affected domain labels
- Track Mean Time To Detection (MTTD)

Use the tools to ingest logs, check health, compute engine metrics, and create incidents if needed.`;
  }

  buildTools() {
    const github = this.deps.github;
    const auditLogger = this.deps.auditLogger;
    const agent = this;

    const listExistingIncidentsTool = tool({
      name: "list_existing_incidents",
      description: "List open incident issues to avoid creating duplicates",
      parameters: z.object({}),
      execute: async () => {
        const issues = await github.listOpenIssues(["incident"]);
        return issues
          .map((i) => `#${(i as { number: number; title: string }).number}: ${(i as { number: number; title: string }).title}`)
          .join("\n") || "No open incidents.";
      },
    });

    const createIncidentIssueTool = tool({
      name: "create_incident_issue",
      description: "Create a GitHub Issue for a detected incident",
      parameters: z.object({
        title: z.string().describe("Issue title prefixed with [Incident]"),
        body: z.string().describe("Issue body with description, impact, and reproduction steps"),
        severity: z.enum(["P0", "P1", "P2", "P3"]),
        affectedDomain: z.string().optional().describe("Affected domain label"),
      }),
      execute: async (args) => {
        const labels = ["incident", "agent-generated", args.severity.toLowerCase()];
        if (args.affectedDomain) labels.push(args.affectedDomain);

        const issue = await github.createIssue({
          title: args.title.startsWith("[Incident]") ? args.title : `[Incident] ${args.title}`,
          body: args.body,
          labels,
        });

        auditLogger.log({
          agentId: "observability",
          action: "incident_issue_created",
          details: { issueNumber: issue.number, severity: args.severity, title: args.title },
          rationale: `Created incident issue #${issue.number}: ${args.title}`,
        });

        return `Created incident issue #${issue.number}: ${args.title}`;
      },
    });

    const fetchVercelLogsTool = tool({
      name: "fetch_vercel_logs",
      description: "Fetch recent runtime/build logs from Vercel for error detection and analysis",
      parameters: z.object({
        source: z.enum(["build", "lambda", "edge", "static"]).optional().describe("Filter by log source"),
        level: z.enum(["error", "warning", "info"]).optional().describe("Filter by log level"),
        since: z.number().optional().describe("Unix timestamp (ms) to fetch logs after"),
        limit: z.number().default(100).describe("Maximum number of log entries"),
      }),
      execute: async (args) => {
        if (!agent.vercelToken || !agent.vercelProjectId) {
          return "Vercel API not configured — cannot fetch runtime logs.";
        }

        try {
          const params = new URLSearchParams({ limit: String(args.limit) });
          if (agent.vercelProjectId) params.set("projectId", agent.vercelProjectId);
          if (args.source) params.set("source", args.source);
          if (args.since) params.set("since", String(args.since));
          if (agent.vercelTeamId) params.set("teamId", agent.vercelTeamId);

          const url = `https://api.vercel.com/v2/deployments/events?${params.toString()}`;
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${agent.vercelToken}` },
          });

          if (!response.ok) {
            return `Vercel logs API returned ${response.status}. Falling back to deployment list check.`;
          }

          const logData = await response.json() as Array<{ message: string; level: string; timestamp: number; source: string }>;
          if (!Array.isArray(logData) || logData.length === 0) {
            return "No recent Vercel logs found.";
          }

          let filtered = logData;
          if (args.level) {
            filtered = filtered.filter((entry) => entry.level === args.level);
          }

          const errorCount = filtered.filter((l) => l.level === "error").length;
          const warnCount = filtered.filter((l) => l.level === "warning").length;

          const summary = [
            `Fetched ${filtered.length} log entries (${errorCount} errors, ${warnCount} warnings).`,
            "",
            ...filtered.slice(0, 30).map((l) =>
              `[${l.level?.toUpperCase() ?? "INFO"}] ${new Date(l.timestamp).toISOString()} (${l.source ?? "unknown"}): ${l.message?.slice(0, 200) ?? ""}`
            ),
          ];

          if (filtered.length > 30) {
            summary.push(`... and ${filtered.length - 30} more entries.`);
          }

          return summary.join("\n");
        } catch (err) {
          return `Failed to fetch Vercel logs: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });

    const fetchSupabaseLogsTool = tool({
      name: "fetch_supabase_logs",
      description: "Fetch recent Supabase Edge Function and API logs for error detection",
      parameters: z.object({
        source: z.enum(["edge_functions", "postgres", "auth", "storage", "realtime"]).default("edge_functions"),
        hoursBack: z.number().default(1).describe("Hours of log history to fetch"),
      }),
      execute: async (args) => {
        if (!agent.supabaseUrl || !agent.supabaseServiceKey) {
          return "Supabase API not configured — cannot fetch logs.";
        }

        const isoStart = new Date(Date.now() - args.hoursBack * 60 * 60 * 1000).toISOString();

        try {
          const logUrl = `${agent.supabaseUrl}/v1/projects/logs?source=${args.source}&iso_timestamp_start=${isoStart}`;
          const response = await fetch(logUrl, {
            headers: {
              apikey: agent.supabaseServiceKey,
              Authorization: `Bearer ${agent.supabaseServiceKey}`,
            },
          });

          if (!response.ok) {
            return `Supabase logs API returned ${response.status}. Log ingestion requires Supabase Management API access.`;
          }

          const data = await response.json() as Array<{ event_message: string; metadata: Record<string, unknown> }>;
          if (!Array.isArray(data) || data.length === 0) {
            return `No ${args.source} logs found in the last ${args.hoursBack} hour(s).`;
          }

          return data.slice(0, 50).map((entry) =>
            `${entry.event_message ?? JSON.stringify(entry.metadata ?? {}).slice(0, 200)}`
          ).join("\n");
        } catch (err) {
          return `Failed to fetch Supabase logs: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });

    const computeEngineHealthTool = tool({
      name: "compute_engine_health",
      description: "Read the engine registry and audit logs to compute current engine health scores",
      parameters: z.object({}),
      execute: async () => {
        const registryContent = await github.getFileContent("src/engines/engine-registry.ts");
        if (!registryContent) return "Engine registry not found at src/engines/engine-registry.ts.";

        const engineNames: string[] = [];
        const enginePattern = /["']([a-zA-Z_-]+)["']\s*:/g;
        let match: RegExpExecArray | null = null;
        while ((match = enginePattern.exec(registryContent)) !== null) {
          engineNames.push(match[1]);
        }

        const recentEntries = auditLogger.getEntries({ limit: 200 });
        const engineErrors = new Map<string, number>();
        for (const entry of recentEntries) {
          if (entry.action.includes("error") || entry.action.includes("fail")) {
            const detailsStr = JSON.stringify(entry.details ?? {});
            for (const name of engineNames) {
              if (detailsStr.includes(name) || entry.rationale?.includes(name)) {
                engineErrors.set(name, (engineErrors.get(name) ?? 0) + 1);
              }
            }
          }
        }

        const healthScores: Array<{ engine: string; score: number; errors: number; status: string }> = [];
        for (const name of engineNames) {
          const errors = engineErrors.get(name) ?? 0;
          const score = Math.max(0, 100 - errors * 10);
          healthScores.push({
            engine: name,
            score,
            errors,
            status: score >= 70 ? "healthy" : score >= 40 ? "degraded" : "critical",
          });
        }

        const globalScore = healthScores.length > 0
          ? Math.round(healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length)
          : 100;

        const alerts: string[] = [];
        for (const h of healthScores) {
          if (h.score < 70) alerts.push(`ALERT: ${h.engine} score ${h.score} (below 70 threshold)`);
        }
        if (globalScore < 75) alerts.push(`ALERT: Global score ${globalScore} (below 75 threshold)`);

        return JSON.stringify({
          engineCount: engineNames.length,
          globalScore,
          engines: healthScores,
          alerts,
        }, null, 2);
      },
    });

    const checkDeploymentHealthTool = tool({
      name: "check_deployment_health",
      description: "Check the latest deployment status for health monitoring",
      parameters: z.object({}),
      execute: async () => {
        const status = await github.getLatestDeploymentStatus();
        return status
          ? `Deployment: ${status.state} (${status.environment}) — updated ${status.updatedAt}`
          : "No deployment status available.";
      },
    });

    const getAuditSummaryTool = tool({
      name: "get_audit_summary",
      description: "Get a summary of recent agent activity and errors",
      parameters: z.object({
        hoursBack: z.number().optional().describe("How many hours of history to include"),
      }),
      execute: async (args) => {
        const since = new Date(Date.now() - (args.hoursBack ?? 24) * 60 * 60 * 1000).toISOString();
        const entries = auditLogger.getEntries({ since, limit: 100 });
        const errors = entries.filter((e) => e.action.includes("error") || e.action.includes("fail"));
        const tokenSummary = auditLogger.getTokenUsageSummary();

        return JSON.stringify({
          totalActions: entries.length,
          errors: errors.length,
          errorDetails: errors.map((e) => ({
            agent: e.agentId,
            action: e.action,
            rationale: e.rationale,
            timestamp: e.timestamp,
          })),
          tokenUsage: tokenSummary,
        }, null, 2);
      },
    });

    const submitHealthReportTool = tool({
      name: "submit_health_report",
      description: "Submit the observability health report",
      parameters: z.object({
        healthStatus: z.enum(["healthy", "degraded", "critical"]),
        incidentsCreated: z.number(),
        engineHealthGlobal: z.number().optional(),
        metrics: z.object({
          errorRate: z.number().optional(),
          activeAlerts: z.number(),
          recentErrors: z.number(),
          vercelLogErrors: z.number().optional(),
          supabaseLogErrors: z.number().optional(),
        }),
        summary: z.string(),
      }),
      execute: async (args) => {
        return JSON.stringify(args);
      },
    });

    return [
      this.buildReadFileTool(),
      listExistingIncidentsTool,
      createIncidentIssueTool,
      fetchVercelLogsTool,
      fetchSupabaseLogsTool,
      computeEngineHealthTool,
      checkDeploymentHealthTool,
      getAuditSummaryTool,
      submitHealthReportTool,
    ];
  }

  protected async runAgent(context: AgentContext): Promise<SubtaskResult> {
    const agent = this.createAgent(context);

    const input = [
      `Perform observability check for issue #${context.task.githubIssueNumber}: ${context.task.title}`,
      "",
      "Steps:",
      "1. Check deployment health",
      "2. Fetch Vercel runtime logs (filter for errors) to detect production issues",
      "3. Fetch Supabase edge function logs to detect backend errors",
      "4. Compute engine health scores from the engine registry and audit logs",
      "5. List existing incidents to avoid duplicates",
      "6. Get audit summary for recent errors",
      "7. Create incident issues if new problems are detected (check for duplicates first)",
      "8. Submit your health report with all metrics",
    ].join("\n");

    const output = await this.executeAgent(agent, input, context);

    let parsed: { healthStatus?: string; incidentsCreated?: number; engineHealthGlobal?: number; summary?: string };
    try {
      parsed = JSON.parse(output);
    } catch {
      parsed = { healthStatus: "healthy", incidentsCreated: 0, summary: output };
    }

    const isCritical = parsed.healthStatus === "critical";

    this.deps.auditLogger.log({
      agentId: this.role,
      action: "observability_check",
      details: {
        healthStatus: parsed.healthStatus,
        incidentsCreated: parsed.incidentsCreated,
        engineHealthGlobal: parsed.engineHealthGlobal,
      },
      taskId: context.task.id,
      subtaskId: context.subtask.id,
      rationale: isCritical
        ? "Critical issues detected during observability check"
        : `Health check complete. ${parsed.incidentsCreated ?? 0} new incidents.`,
    });

    return {
      success: !isCritical,
      summary: isCritical
        ? `Critical health issues: ${parsed.summary ?? ""}`
        : `Health check passed. ${parsed.incidentsCreated ?? 0} incidents created. ${parsed.summary ?? ""}`,
    };
  }
}
