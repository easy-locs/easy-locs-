import { db } from "@/services/db";
import { logAuditEvent } from "../audit-log";
import { createGithubIssue } from "../github-integration";
import type { MonitoringFinding } from "../types";

interface Level2Config {
  githubToken?: string;
  githubRepo?: string;
}

let _config: Level2Config = {};

export function configureLevel2(config: Level2Config) {
  _config = config;
}

interface AssessmentResult {
  category: string;
  title: string;
  description: string;
  severity: "medium" | "low" | "info";
  source_engine: string;
  finding_data?: Record<string, unknown>;
}

async function analyzePatchSuggestions(): Promise<AssessmentResult[]> {
  const results: AssessmentResult[] = [];

  const { data: recentFindings } = await db("monitoring_findings")
    .select("*")
    .eq("level", 1)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  if (recentFindings && recentFindings.length > 0) {
    const categoryGroups = new Map<string, typeof recentFindings>();
    for (const f of recentFindings) {
      const group = categoryGroups.get(f.category) || [];
      group.push(f);
      categoryGroups.set(f.category, group);
    }

    for (const [category, findings] of categoryGroups) {
      if (findings.length >= 3) {
        results.push({
          category: "patch_suggestion",
          title: `Recurring issue pattern in ${category}`,
          description: `${findings.length} open findings detected in '${category}'. Consider a targeted patch to address the root cause. Related findings: ${findings.map((f) => f.title).join(", ")}`,
          severity: "medium",
          source_engine: "patch-analyzer",
          finding_data: {
            pattern_category: category,
            finding_count: findings.length,
            finding_ids: findings.map((f) => f.id),
          },
        });
      }
    }
  }

  return results;
}

async function analyzeRefactorOpportunities(): Promise<AssessmentResult[]> {
  const results: AssessmentResult[] = [];

  const { data: actions } = await db("agent_actions")
    .select("agent_name, action_type, status")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(100);

  if (actions && actions.length > 0) {
    const failuresByType = new Map<string, number>();
    for (const a of actions) {
      const key = a.action_type;
      failuresByType.set(key, (failuresByType.get(key) || 0) + 1);
    }

    for (const [type, count] of failuresByType) {
      if (count >= 5) {
        results.push({
          category: "refactor_recommendation",
          title: `Frequent failures in ${type} actions`,
          description: `${count} failures detected for action type '${type}'. This area may benefit from refactoring or improved error handling.`,
          severity: "medium",
          source_engine: "refactor-analyzer",
          finding_data: { action_type: type, failure_count: count },
        });
      }
    }
  }

  return results;
}

async function analyzeDependencyRisk(): Promise<AssessmentResult[]> {
  const results: AssessmentResult[] = [];

  const { data: costs } = await db("cost_tracking")
    .select("agent_name, cost_usd, date")
    .order("date", { ascending: false })
    .limit(100);

  if (costs && costs.length > 0) {
    const dailyCosts = new Map<string, number>();
    for (const c of costs) {
      const key = c.date;
      dailyCosts.set(key, (dailyCosts.get(key) || 0) + Number(c.cost_usd));
    }

    const sortedDays = [...dailyCosts.entries()].sort((a, b) => b[1] - a[1]);
    if (sortedDays.length > 0 && sortedDays[0][1] > 50) {
      results.push({
        category: "dependency_risk",
        title: `High API cost spike detected`,
        description: `Daily API cost reached $${sortedDays[0][1].toFixed(2)} on ${sortedDays[0][0]}. Review agent token consumption.`,
        severity: "medium",
        source_engine: "cost-analyzer",
        finding_data: { peak_date: sortedDays[0][0], peak_cost: sortedDays[0][1] },
      });
    }
  }

  return results;
}

export async function runLevel2Analysis(): Promise<MonitoringFinding[]> {
  const allAnalyses = await Promise.allSettled([
    analyzePatchSuggestions(),
    analyzeRefactorOpportunities(),
    analyzeDependencyRisk(),
  ]);

  const results: AssessmentResult[] = [];
  for (const analysis of allAnalyses) {
    if (analysis.status === "fulfilled") {
      results.push(...analysis.value);
    }
  }

  const inserted: MonitoringFinding[] = [];
  for (const result of results) {
    let ghIssue: { number: number; url: string } | null = null;

    if (_config.githubToken && _config.githubRepo) {
      ghIssue = await createGithubIssue({
        token: _config.githubToken,
        repo: _config.githubRepo,
        title: `[L2 Draft] ${result.title}`,
        body: `## Level 2 Assisted Analysis\n\n**Category:** ${result.category}\n**Severity:** ${result.severity}\n**Engine:** ${result.source_engine}\n\n${result.description}\n\n### Analysis Data\n\`\`\`json\n${JSON.stringify(result.finding_data, null, 2)}\n\`\`\`\n\n---\n*Draft issue — auto-created by Level 2 assisted monitoring for human review*`,
        labels: [`severity:${result.severity}`, `monitor:level2`, `category:${result.category}`, "draft", "needs-review"],
        draft: true,
      });
    }

    const { data } = await db("monitoring_findings")
      .insert({
        level: 2,
        category: result.category,
        title: result.title,
        description: result.description,
        severity: result.severity,
        source_engine: result.source_engine,
        finding_data: result.finding_data || {},
        github_issue_number: ghIssue?.number || null,
        github_issue_url: ghIssue?.url || null,
        auto_created: true,
        status: "open",
      })
      .select()
      .single();

    if (data) inserted.push(data as MonitoringFinding);
  }

  if (results.length > 0) {
    await logAuditEvent({
      event_type: "level2_analysis_run",
      actor_type: "cron",
      actor_name: "level2-analyzer",
      action: `Level 2 analysis completed: ${results.length} recommendations`,
      details: {
        recommendation_count: results.length,
        categories: [...new Set(results.map((r) => r.category))],
      },
    });
  }

  return inserted;
}
