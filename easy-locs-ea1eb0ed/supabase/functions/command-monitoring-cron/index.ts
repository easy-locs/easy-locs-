import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "";
const GITHUB_API = "https://api.github.com";
const INTERNAL_SECRET = Deno.env.get("INTERNAL_NOTIFICATION_SECRET") || "";
const VERCEL_TOKEN = Deno.env.get("VERCEL_TOKEN") || "";
const VERCEL_PROJECT_ID = Deno.env.get("VERCEL_PROJECT_ID") || "";
const VERCEL_TEAM_ID = Deno.env.get("VERCEL_ORG_ID") || "";

type Severity = "critical" | "high" | "medium" | "low" | "info";
type Db = ReturnType<typeof createClient>;

interface CheckResult {
  category: string;
  title: string;
  description: string;
  severity: Severity;
  source_engine: string;
  finding_data?: Record<string, unknown>;
}

async function createGithubIssue(params: {
  title: string;
  body: string;
  labels?: string[];
  draft?: boolean;
}): Promise<{ number: number; url: string } | null> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return null;
  try {
    const body = params.draft
      ? `> **Draft Issue** — This issue was auto-generated for human review.\n\n${params.body}`
      : params.body;
    const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: params.title, body, labels: params.labels || [] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { number: data.number, url: data.html_url };
  } catch { return null; }
}

async function checkArchitectureDrift(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const expectedTables = [
    "profiles", "orgs", "org_members", "properties", "tenants",
    "leases", "booking_requests", "messages", "notifications",
  ];

  for (const table of expectedTables) {
    try {
      const { error } = await db.from(table).select("id", { count: "exact", head: true }).limit(0);
      if (error) {
        findings.push({
          category: "architecture_drift", title: `Table unreachable: ${table}`,
          description: `The table '${table}' returned an error on probe: ${error.message}`,
          severity: "high", source_engine: "arch-drift-detector",
          finding_data: { table, error: error.message },
        });
      }
    } catch (err) {
      findings.push({
        category: "architecture_drift", title: `Table probe failed: ${table}`,
        description: `Failed to probe table '${table}': ${(err as Error).message}`,
        severity: "high", source_engine: "arch-drift-detector",
        finding_data: { table },
      });
    }
  }
  return findings;
}

async function checkRuntimeErrors(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db.from("command_audit_log")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "runtime_error")
    .gte("created_at", oneHourAgo);

  if ((count || 0) > 10) {
    findings.push({
      category: "runtime_errors", title: `High error rate: ${count} errors in last hour`,
      description: `Detected ${count} runtime errors in the past hour.`,
      severity: (count || 0) > 50 ? "critical" : "high",
      source_engine: "runtime-error-monitor",
      finding_data: { error_count: count, window: "1h" },
    });
  }
  return findings;
}

async function checkDuplicateDetection(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const { data: dupEmails } = await db.from("command_emails")
    .select("from_email, subject").order("created_at", { ascending: false }).limit(100);

  if (dupEmails) {
    const seen = new Map<string, number>();
    for (const e of dupEmails) {
      const key = `${e.from_email}:${e.subject}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    for (const [key, count] of seen) {
      if (count > 3) {
        findings.push({
          category: "duplicate_detection", title: `Duplicate email pattern detected`,
          description: `Email pattern "${key}" appeared ${count} times in recent intake.`,
          severity: "medium", source_engine: "dedup-detector",
          finding_data: { pattern: key, count },
        });
      }
    }
  }
  return findings;
}

async function checkRouteValidation(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const { data: recentErrors } = await db.from("command_audit_log")
    .select("details").eq("event_type", "route_error")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()).limit(50);

  if (recentErrors && recentErrors.length > 0) {
    const routeErrors = new Map<string, number>();
    for (const entry of recentErrors) {
      const route = (entry.details as Record<string, unknown>)?.route as string || "unknown";
      routeErrors.set(route, (routeErrors.get(route) || 0) + 1);
    }
    for (const [route, count] of routeErrors) {
      if (count >= 3) {
        findings.push({
          category: "route_validation", title: `Route errors detected: ${route}`,
          description: `${count} errors logged for route '${route}' in the last hour.`,
          severity: count >= 10 ? "high" : "medium", source_engine: "route-validator",
          finding_data: { route, error_count: count },
        });
      }
    }
  }
  return findings;
}

async function checkEngineHealth(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const { data: healthSnaps } = await db.from("system_health_snapshots")
    .select("*").order("checked_at", { ascending: false }).limit(20);

  if (healthSnaps) {
    for (const snap of healthSnaps) {
      if (snap.status === "down") {
        findings.push({
          category: "engine_health", title: `Component DOWN: ${snap.component}`,
          description: `System component '${snap.component}' is reporting as down.`,
          severity: "critical", source_engine: "health-checker",
          finding_data: { component: snap.component, details: snap.details },
        });
      } else if (snap.status === "degraded") {
        findings.push({
          category: "engine_health", title: `Component degraded: ${snap.component}`,
          description: `System component '${snap.component}' is showing degraded performance.`,
          severity: "medium", source_engine: "health-checker",
          finding_data: { component: snap.component, response_time_ms: snap.response_time_ms },
        });
      }
    }
  }
  return findings;
}

async function checkDeadCode(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const { data: unusedActions } = await db.from("agent_actions")
    .select("agent_name, action_type, branch_name")
    .eq("status", "completed").not("branch_name", "is", null)
    .order("completed_at", { ascending: false }).limit(50);

  if (unusedActions) {
    const stalePatterns = new Map<string, number>();
    for (const a of unusedActions) {
      if (a.branch_name && a.action_type === "code_change") {
        stalePatterns.set(a.branch_name, (stalePatterns.get(a.branch_name) || 0) + 1);
      }
    }
    for (const [branch, count] of stalePatterns) {
      if (count >= 3) {
        findings.push({
          category: "dead_code", title: `Potential dead code in branch: ${branch}`,
          description: `Branch '${branch}' has ${count} completed changes without merge.`,
          severity: "low", source_engine: "dead-code-scanner",
          finding_data: { branch, change_count: count },
        });
      }
    }
  }

  const { data: failedFindings } = await db.from("monitoring_findings")
    .select("category, title").eq("status", "dismissed").eq("level", 1)
    .order("created_at", { ascending: false }).limit(50);

  if (failedFindings) {
    const dismissedCategories = new Map<string, number>();
    for (const f of failedFindings) {
      dismissedCategories.set(f.category, (dismissedCategories.get(f.category) || 0) + 1);
    }
    for (const [category, count] of dismissedCategories) {
      if (count >= 5) {
        findings.push({
          category: "dead_code", title: `Recurring dismissed findings in ${category}`,
          description: `${count} findings in '${category}' have been dismissed.`,
          severity: "info", source_engine: "dead-code-scanner",
          finding_data: { category, dismissed_count: count },
        });
      }
    }
  }
  return findings;
}

async function checkStaleActions(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: staleActions } = await db.from("agent_actions")
    .select("id, agent_name, action_type, created_at")
    .eq("status", "running").lt("created_at", staleThreshold);

  if (staleActions && staleActions.length > 0) {
    for (const action of staleActions) {
      findings.push({
        category: "agent_health", title: `Stale agent action: ${action.agent_name}`,
        description: `Agent action ${action.id} (${action.action_type}) has been running since ${action.created_at}`,
        severity: "high", source_engine: "agent_monitor",
        finding_data: { action_id: action.id, agent_name: action.agent_name, started: action.created_at },
      });
    }
  }
  return findings;
}

async function checkExpiredApprovals(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const expiredThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data: expired } = await db.from("approval_requests")
    .select("id, pr_number, pr_title, created_at")
    .eq("status", "pending").lt("created_at", expiredThreshold);

  if (expired && expired.length > 0) {
    for (const req of expired) {
      await db.from("approval_requests").update({
        status: "expired", updated_at: new Date().toISOString(),
      }).eq("id", req.id);
      findings.push({
        category: "approval_workflow", title: `Expired approval: PR #${req.pr_number}`,
        description: `Approval request for "${req.pr_title}" expired without action`,
        severity: "medium", source_engine: "approval_monitor",
        finding_data: { pr_number: req.pr_number, created_at: req.created_at },
      });
    }
  }
  return findings;
}

async function checkCostAnomalies(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: costs } = await db.from("cost_tracking")
    .select("agent_name, cost_usd, date").gte("date", weekAgo).lte("date", today);

  if (costs && costs.length > 0) {
    const agentCosts = new Map<string, number[]>();
    for (const c of costs) {
      const arr = agentCosts.get(c.agent_name) || [];
      arr.push(Number(c.cost_usd));
      agentCosts.set(c.agent_name, arr);
    }
    for (const [agent, dailyCosts] of agentCosts) {
      const avg = dailyCosts.reduce((s, v) => s + v, 0) / dailyCosts.length;
      const latest = dailyCosts[dailyCosts.length - 1];
      if (latest > avg * 3 && latest > 1) {
        findings.push({
          category: "cost", title: `Cost spike: ${agent}`,
          description: `Agent ${agent} cost $${latest.toFixed(2)} today vs $${avg.toFixed(2)} avg`,
          severity: latest > avg * 5 ? "high" : "medium", source_engine: "cost_monitor",
          finding_data: { agent, latest_cost: latest, avg_cost: avg, spike_ratio: latest / avg },
        });
      }
    }
  }
  return findings;
}

async function checkDeploymentInfra(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];

  const dbStart = Date.now();
  try {
    const { error } = await db.from("system_health_snapshots").select("id").limit(1);
    const responseTime = Date.now() - dbStart;
    await db.from("system_health_snapshots").insert({
      component: "supabase_db", status: error ? "degraded" : "healthy",
      response_time_ms: responseTime, details: error ? { error: error.message } : {},
    });
    if (error) {
      findings.push({
        category: "infrastructure", title: "Supabase DB query failure",
        description: `Database health check failed: ${error.message}`,
        severity: "high", source_engine: "health_monitor",
        finding_data: { error: error.message, response_time_ms: responseTime },
      });
    }
  } catch (err) {
    findings.push({
      category: "infrastructure", title: "Supabase DB unreachable",
      description: `Cannot reach Supabase: ${(err as Error).message}`,
      severity: "critical", source_engine: "health_monitor",
    });
  }

  try {
    const authStart = Date.now();
    const { error } = await db.auth.getSession();
    const responseTime = Date.now() - authStart;
    await db.from("system_health_snapshots").insert({
      component: "supabase_auth", status: error ? "degraded" : "healthy",
      response_time_ms: responseTime, details: {},
    });
    if (error) {
      findings.push({
        category: "infrastructure", title: "Supabase Auth degraded",
        description: `Auth health check returned error: ${error.message}`,
        severity: "medium", source_engine: "health_monitor",
      });
    }
  } catch { /* non-critical */ }

  try {
    const fnStart = Date.now();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
      method: "GET",
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    const responseTime = Date.now() - fnStart;
    const status = res.ok ? "healthy" : res.status >= 500 ? "down" : "degraded";
    await db.from("system_health_snapshots").insert({
      component: "supabase_edge_functions", status, response_time_ms: responseTime, details: { http_status: res.status },
    });
    if (!res.ok) {
      findings.push({
        category: "infrastructure", title: "Edge Functions degraded",
        description: `Edge function health check returned HTTP ${res.status}`,
        severity: res.status >= 500 ? "high" : "medium", source_engine: "health_monitor",
        finding_data: { http_status: res.status, response_time_ms: responseTime },
      });
    }
  } catch (err) {
    await db.from("system_health_snapshots").insert({
      component: "supabase_edge_functions", status: "down", response_time_ms: null,
      details: { error: (err as Error).message },
    });
  }

  if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
    try {
      const vercelStart = Date.now();
      const queryParams = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}&` : "?";
      const res = await fetch(
        `https://api.vercel.com/v6/deployments${queryParams}projectId=${VERCEL_PROJECT_ID}&target=production&limit=1`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      const responseTime = Date.now() - vercelStart;
      if (res.ok) {
        const data = await res.json();
        const latest = data.deployments?.[0];
        const deployStatus = latest?.readyState === "READY" ? "healthy" : latest?.readyState === "ERROR" ? "down" : "degraded";
        await db.from("system_health_snapshots").insert({
          component: "vercel_deployment", status: deployStatus,
          response_time_ms: responseTime,
          details: { latest_id: latest?.uid, state: latest?.readyState, url: latest?.url },
        });
        if (deployStatus !== "healthy") {
          findings.push({
            category: "infrastructure", title: `Vercel deployment ${deployStatus}`,
            description: `Latest production deployment state: ${latest?.readyState}`,
            severity: deployStatus === "down" ? "critical" : "medium", source_engine: "health_monitor",
            finding_data: { deployment_id: latest?.uid, state: latest?.readyState },
          });
        }
      } else {
        await db.from("system_health_snapshots").insert({
          component: "vercel_deployment", status: "unknown", response_time_ms: responseTime,
          details: { http_status: res.status },
        });
      }
    } catch (err) {
      await db.from("system_health_snapshots").insert({
        component: "vercel_deployment", status: "unknown", response_time_ms: null,
        details: { error: (err as Error).message },
      });
    }
  }

  try {
    const storageStart = Date.now();
    const { data, error } = await db.storage.listBuckets();
    const responseTime = Date.now() - storageStart;
    await db.from("system_health_snapshots").insert({
      component: "supabase_storage", status: error ? "degraded" : "healthy",
      response_time_ms: responseTime, details: error ? { error: error.message } : { bucket_count: data?.length },
    });
  } catch { /* non-critical */ }

  return findings;
}

async function runLevel2Analyses(db: Db): Promise<CheckResult[]> {
  const findings: CheckResult[] = [];

  const { data: recentFindings } = await db.from("monitoring_findings")
    .select("*").eq("level", 1).eq("status", "open")
    .order("created_at", { ascending: false }).limit(50);

  if (recentFindings && recentFindings.length > 0) {
    const categoryGroups = new Map<string, typeof recentFindings>();
    for (const f of recentFindings) {
      const group = categoryGroups.get(f.category) || [];
      group.push(f);
      categoryGroups.set(f.category, group);
    }
    for (const [category, items] of categoryGroups) {
      if (items.length >= 3) {
        findings.push({
          category: "patch_suggestion",
          title: `Recurring issue pattern in ${category}`,
          description: `${items.length} open findings in '${category}'. Consider a targeted patch. Related: ${items.map((f) => f.title).join(", ")}`,
          severity: "medium", source_engine: "patch-analyzer",
          finding_data: { pattern_category: category, finding_count: items.length, finding_ids: items.map((f) => f.id) },
        });
      }
    }
  }

  const { data: actions } = await db.from("agent_actions")
    .select("agent_name, action_type, status")
    .eq("status", "failed").order("created_at", { ascending: false }).limit(100);

  if (actions && actions.length > 0) {
    const failuresByType = new Map<string, number>();
    for (const a of actions) {
      failuresByType.set(a.action_type, (failuresByType.get(a.action_type) || 0) + 1);
    }
    for (const [type, count] of failuresByType) {
      if (count >= 5) {
        findings.push({
          category: "refactor_recommendation",
          title: `Frequent failures in ${type} actions`,
          description: `${count} failures for action type '${type}'. Consider refactoring or improved error handling.`,
          severity: "medium", source_engine: "refactor-analyzer",
          finding_data: { action_type: type, failure_count: count },
        });
      }
    }
  }

  const { data: costs } = await db.from("cost_tracking")
    .select("agent_name, cost_usd, date")
    .order("date", { ascending: false }).limit(100);

  if (costs && costs.length > 0) {
    const dailyCosts = new Map<string, number>();
    for (const c of costs) {
      dailyCosts.set(c.date, (dailyCosts.get(c.date) || 0) + Number(c.cost_usd));
    }
    const sortedDays = [...dailyCosts.entries()].sort((a, b) => b[1] - a[1]);
    if (sortedDays.length > 0 && sortedDays[0][1] > 50) {
      findings.push({
        category: "dependency_risk",
        title: `High API cost spike detected`,
        description: `Daily API cost reached $${sortedDays[0][1].toFixed(2)} on ${sortedDays[0][0]}.`,
        severity: "medium", source_engine: "cost-analyzer",
        finding_data: { peak_date: sortedDays[0][0], peak_cost: sortedDays[0][1] },
      });
    }
  }

  return findings;
}

Deno.serve(async (req) => {
  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405 });
  }

  if (!INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 503 });
  }

  const authHeader = req.headers.get("x-internal-secret") || "";
  if (authHeader !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { level?: number } = {};
  try { body = await req.json(); } catch { /* default to level 1 */ }
  const level = body.level || 1;

  const allFindings: CheckResult[] = [];

  if (level === 1) {
    const results = await Promise.allSettled([
      checkArchitectureDrift(supabase),
      checkRuntimeErrors(supabase),
      checkDuplicateDetection(supabase),
      checkRouteValidation(supabase),
      checkEngineHealth(supabase),
      checkDeadCode(supabase),
      checkStaleActions(supabase),
      checkExpiredApprovals(supabase),
      checkCostAnomalies(supabase),
      checkDeploymentInfra(supabase),
    ]);
    for (const result of results) {
      if (result.status === "fulfilled") allFindings.push(...result.value);
    }
  } else if (level === 2) {
    const results = await Promise.allSettled([
      runLevel2Analyses(supabase),
    ]);
    for (const result of results) {
      if (result.status === "fulfilled") allFindings.push(...result.value);
    }
  }

  const isDraft = level === 2;
  const inserted = [];
  for (const finding of allFindings) {
    let ghIssue: { number: number; url: string } | null = null;
    const requiresIssue = level === 1
      ? (finding.severity === "critical" || finding.severity === "high")
      : true;

    if (requiresIssue && GITHUB_TOKEN && GITHUB_REPO) {
      ghIssue = await createGithubIssue({
        title: isDraft
          ? `[L2 Draft] ${finding.title}`
          : `[L${level} ${finding.severity.toUpperCase()}] ${finding.title}`,
        body: `## Level ${level} Monitoring Finding\n\n**Category:** ${finding.category}\n**Severity:** ${finding.severity}\n**Engine:** ${finding.source_engine}\n\n${finding.description}\n\n### Finding Data\n\`\`\`json\n${JSON.stringify(finding.finding_data, null, 2)}\n\`\`\`\n\n---\n*Auto-created by Level ${level} monitoring cron*`,
        labels: [
          `severity:${finding.severity}`,
          `monitor:level${level}`,
          `category:${finding.category}`,
          "auto-created",
          ...(isDraft ? ["draft", "needs-review"] : []),
        ],
        draft: isDraft,
      });
    }

    const issueCreationFailed = requiresIssue && !!GITHUB_TOKEN && !!GITHUB_REPO && !ghIssue;

    const { data } = await supabase.from("monitoring_findings").insert({
      level,
      category: finding.category,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      source_engine: finding.source_engine,
      finding_data: {
        ...(finding.finding_data || {}),
        ...(issueCreationFailed ? { _issue_creation_failed: true } : {}),
      },
      github_issue_number: ghIssue?.number || null,
      github_issue_url: ghIssue?.url || null,
      auto_created: true,
      status: "open",
    }).select().single();

    if (issueCreationFailed) {
      await supabase.from("command_audit_log").insert({
        event_type: "github_issue_creation_failed",
        actor_type: "cron",
        actor_name: `level${level}-monitor`,
        action: `Failed to create GitHub issue for ${finding.severity} finding: ${finding.title}`,
        details: { category: finding.category, severity: finding.severity },
      });
    }

    if (data) inserted.push(data);
  }

  await supabase.from("command_audit_log").insert({
    event_type: `level${level}_monitoring_run`,
    actor_type: "cron",
    actor_name: `level${level}-monitor-cron`,
    action: `Level ${level} cron completed: ${allFindings.length} findings`,
    details: {
      finding_count: allFindings.length,
      categories: [...new Set(allFindings.map((f) => f.category))],
      severities: allFindings.reduce((acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      github_issues_created: inserted.filter((i) => i.github_issue_number).length,
      issue_creation_failures: inserted.filter((i) => i.finding_data?._issue_creation_failed).length,
    },
  });

  return new Response(JSON.stringify({
    status: "ok",
    level,
    findings_count: allFindings.length,
    inserted_count: inserted.length,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});
