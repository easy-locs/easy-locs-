import { db } from "@/services/db";
import { logAuditEvent } from "../audit-log";
import { createGithubIssue } from "../github-integration";
import type { FindingSeverity, MonitoringFinding } from "../types";

interface CheckResult {
  category: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  source_engine: string;
  finding_data?: Record<string, unknown>;
}

interface Level1Config {
  githubToken?: string;
  githubRepo?: string;
}

let _config: Level1Config = {};

export function configureLevel1(config: Level1Config) {
  _config = config;
}

async function checkArchitectureDrift(): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];

  const expectedTables = [
    "profiles", "orgs", "org_members", "properties", "tenants",
    "leases", "booking_requests", "messages", "notifications",
  ];

  for (const table of expectedTables) {
    try {
      const { error } = await db(table).select("id", { count: "exact", head: true }).limit(0);
      if (error) {
        findings.push({
          category: "architecture_drift",
          title: `Table unreachable: ${table}`,
          description: `The table '${table}' returned an error on probe: ${error.message}`,
          severity: "high",
          source_engine: "arch-drift-detector",
          finding_data: { table, error: error.message },
        });
      }
    } catch (err) {
      findings.push({
        category: "architecture_drift",
        title: `Table probe failed: ${table}`,
        description: `Failed to probe table '${table}': ${(err as Error).message}`,
        severity: "high",
        source_engine: "arch-drift-detector",
        finding_data: { table },
      });
    }
  }

  return findings;
}

async function checkRuntimeErrors(): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db("command_audit_log")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "runtime_error")
    .gte("created_at", oneHourAgo);

  if ((count || 0) > 10) {
    findings.push({
      category: "runtime_errors",
      title: `High error rate: ${count} errors in last hour`,
      description: `Detected ${count} runtime errors in the past hour. Investigation recommended.`,
      severity: (count || 0) > 50 ? "critical" : "high",
      source_engine: "runtime-error-monitor",
      finding_data: { error_count: count, window: "1h" },
    });
  }

  return findings;
}

async function checkDuplicateDetection(): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];

  const { data: dupEmails } = await db("command_emails")
    .select("from_email, subject")
    .order("created_at", { ascending: false })
    .limit(100);

  if (dupEmails) {
    const seen = new Map<string, number>();
    for (const e of dupEmails) {
      const key = `${e.from_email}:${e.subject}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    for (const [key, count] of seen) {
      if (count > 3) {
        findings.push({
          category: "duplicate_detection",
          title: `Duplicate email pattern detected`,
          description: `Email pattern "${key}" appeared ${count} times in recent intake.`,
          severity: "medium",
          source_engine: "dedup-detector",
          finding_data: { pattern: key, count },
        });
      }
    }
  }

  return findings;
}

async function checkRouteValidation(): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];

  const { data: recentErrors } = await db("command_audit_log")
    .select("details")
    .eq("event_type", "route_error")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .limit(50);

  if (recentErrors && recentErrors.length > 0) {
    const routeErrors = new Map<string, number>();
    for (const entry of recentErrors) {
      const route = (entry.details as Record<string, unknown>)?.route as string || "unknown";
      routeErrors.set(route, (routeErrors.get(route) || 0) + 1);
    }

    for (const [route, count] of routeErrors) {
      if (count >= 3) {
        findings.push({
          category: "route_validation",
          title: `Route errors detected: ${route}`,
          description: `${count} errors logged for route '${route}' in the last hour.`,
          severity: count >= 10 ? "high" : "medium",
          source_engine: "route-validator",
          finding_data: { route, error_count: count },
        });
      }
    }
  }

  return findings;
}

async function checkEngineHealth(): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];

  const { data: healthSnaps } = await db("system_health_snapshots")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(20);

  if (healthSnaps) {
    for (const snap of healthSnaps) {
      if (snap.status === "down") {
        findings.push({
          category: "engine_health",
          title: `Component DOWN: ${snap.component}`,
          description: `System component '${snap.component}' is reporting as down.`,
          severity: "critical",
          source_engine: "health-checker",
          finding_data: { component: snap.component, details: snap.details },
        });
      } else if (snap.status === "degraded") {
        findings.push({
          category: "engine_health",
          title: `Component degraded: ${snap.component}`,
          description: `System component '${snap.component}' is showing degraded performance.`,
          severity: "medium",
          source_engine: "health-checker",
          finding_data: { component: snap.component, response_time_ms: snap.response_time_ms },
        });
      }
    }
  }

  return findings;
}

async function checkDeadCode(): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];

  const { data: unusedActions } = await db("agent_actions")
    .select("agent_name, action_type, branch_name")
    .eq("status", "completed")
    .not("branch_name", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50);

  if (unusedActions) {
    const stalePatterns = new Map<string, number>();
    for (const a of unusedActions) {
      if (a.branch_name && a.action_type === "code_change") {
        const key = a.branch_name as string;
        stalePatterns.set(key, (stalePatterns.get(key) || 0) + 1);
      }
    }

    for (const [branch, count] of stalePatterns) {
      if (count >= 3) {
        findings.push({
          category: "dead_code",
          title: `Potential dead code in branch: ${branch}`,
          description: `Branch '${branch}' has ${count} completed changes without merge. May contain dead or abandoned code.`,
          severity: "low",
          source_engine: "dead-code-scanner",
          finding_data: { branch, change_count: count },
        });
      }
    }
  }

  const { data: failedFindings } = await db("monitoring_findings")
    .select("category, title")
    .eq("status", "dismissed")
    .eq("level", 1)
    .order("created_at", { ascending: false })
    .limit(50);

  if (failedFindings) {
    const dismissedCategories = new Map<string, number>();
    for (const f of failedFindings) {
      dismissedCategories.set(f.category, (dismissedCategories.get(f.category) || 0) + 1);
    }

    for (const [category, count] of dismissedCategories) {
      if (count >= 5) {
        findings.push({
          category: "dead_code",
          title: `Recurring dismissed findings in ${category}`,
          description: `${count} findings in '${category}' have been dismissed — may indicate dead or obsolete monitoring rules.`,
          severity: "info",
          source_engine: "dead-code-scanner",
          finding_data: { category, dismissed_count: count },
        });
      }
    }
  }

  return findings;
}

export async function runLevel1Checks(): Promise<MonitoringFinding[]> {
  const allChecks = await Promise.allSettled([
    checkArchitectureDrift(),
    checkRuntimeErrors(),
    checkDuplicateDetection(),
    checkRouteValidation(),
    checkEngineHealth(),
    checkDeadCode(),
  ]);

  const results: CheckResult[] = [];
  for (const check of allChecks) {
    if (check.status === "fulfilled") {
      results.push(...check.value);
    }
  }

  const inserted: MonitoringFinding[] = [];
  for (const result of results) {
    let ghIssue: { number: number; url: string } | null = null;

    const requiresIssue = result.severity === "critical" || result.severity === "high";

    if (requiresIssue && _config.githubToken && _config.githubRepo) {
      ghIssue = await createGithubIssue({
        token: _config.githubToken,
        repo: _config.githubRepo,
        title: `[L1 ${result.severity.toUpperCase()}] ${result.title}`,
        body: `## Level 1 Monitoring Finding\n\n**Category:** ${result.category}\n**Severity:** ${result.severity}\n**Engine:** ${result.source_engine}\n\n${result.description}\n\n### Finding Data\n\`\`\`json\n${JSON.stringify(result.finding_data, null, 2)}\n\`\`\`\n\n---\n*Auto-created by Level 1 always-on monitoring*`,
        labels: [`severity:${result.severity}`, `monitor:level1`, `category:${result.category}`, "auto-created"],
      });
    }

    const issueCreationFailed = requiresIssue && !!_config.githubToken && !!_config.githubRepo && !ghIssue;

    const { data } = await db("monitoring_findings")
      .insert({
        level: 1,
        category: result.category,
        title: result.title,
        description: result.description,
        severity: result.severity,
        source_engine: result.source_engine,
        finding_data: {
          ...(result.finding_data || {}),
          ...(issueCreationFailed ? { _issue_creation_failed: true } : {}),
        },
        github_issue_number: ghIssue?.number || null,
        github_issue_url: ghIssue?.url || null,
        auto_created: true,
        status: "open",
      })
      .select()
      .single();

    if (issueCreationFailed) {
      await logAuditEvent({
        event_type: "github_issue_creation_failed",
        actor_type: "cron",
        actor_name: "level1-monitor",
        action: `Failed to create GitHub issue for ${result.severity} finding: ${result.title}`,
        details: { category: result.category, severity: result.severity },
      });
    }

    if (data) inserted.push(data as MonitoringFinding);
  }

  if (results.length > 0) {
    await logAuditEvent({
      event_type: "level1_monitoring_run",
      actor_type: "cron",
      actor_name: "level1-monitor",
      action: `Level 1 scan completed: ${results.length} findings`,
      details: {
        finding_count: results.length,
        categories: [...new Set(results.map((r) => r.category))],
        severities: results.reduce((acc, r) => {
          acc[r.severity] = (acc[r.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  }

  return inserted;
}
