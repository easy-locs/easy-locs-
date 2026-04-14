import { tool } from "@openai/agents";
import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext, SubtaskResult } from "../types.js";
import type { AgentDependencies } from "./base-agent.js";

interface VercelDeployment {
  uid: string;
  url: string;
  state: string;
  createdAt: number;
  meta?: Record<string, string>;
}

export class DeployAgent extends BaseAgent {
  private vercelToken?: string;
  private vercelProjectId?: string;
  private vercelTeamId?: string;

  constructor(deps: AgentDependencies, options?: { vercelToken?: string; vercelProjectId?: string; vercelTeamId?: string }) {
    super("deploy", deps);
    this.vercelToken = options?.vercelToken;
    this.vercelProjectId = options?.vercelProjectId;
    this.vercelTeamId = options?.vercelTeamId;
  }

  get systemPrompt(): string {
    return `You are the Deploy Agent for the Easy-Locs platform.

You control the deployment pipeline: checking PR safety, monitoring Vercel deployment status, and controlling production promotion.

Deployment Flow:
1. PR opened -> Vercel auto-creates preview deployment
2. All agent reviews pass -> Deploy Agent marks as "ready for preview"
3. Human reviews preview -> approves or requests changes
4. Human merges PR -> Vercel deploys to production
5. Deploy Agent monitors production health post-deploy

Safety Checks:
- Chief Architect review must be APPROVED
- QA Validation must be SAFE
- Supabase validation must be PASSED (if schema changes)
- No critical issues in observability
- Preview URL responds with 200

NEVER auto-merge or auto-promote to production. Always require human approval.
Use the tools to check deployment status, list deployments, and submit your assessment.`;
  }

  private async vercelAPI(path: string, method = "GET", body?: Record<string, unknown>): Promise<string> {
    if (!this.vercelToken) {
      return "Vercel API not configured — cannot check deployment status programmatically.";
    }

    try {
      const url = new URL(path, "https://api.vercel.com");
      if (this.vercelTeamId) {
        url.searchParams.set("teamId", this.vercelTeamId);
      }

      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.vercelToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const text = await response.text();
        return `Vercel API error ${response.status}: ${text.slice(0, 500)}`;
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Vercel API call failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  buildTools() {
    const github = this.deps.github;
    const agent = this;

    const checkDeploymentStatusTool = tool({
      name: "check_deployment_status",
      description: "Check the latest GitHub deployment status for the repository",
      parameters: z.object({}),
      execute: async () => {
        const status = await github.getLatestDeploymentStatus();
        return status
          ? JSON.stringify(status, null, 2)
          : "No deployment data available.";
      },
    });

    const listVercelDeploymentsTool = tool({
      name: "list_vercel_deployments",
      description: "List recent Vercel deployments with their status, URL, and metadata",
      parameters: z.object({
        limit: z.number().default(5).describe("Number of deployments to list"),
        state: z.enum(["BUILDING", "READY", "ERROR", "QUEUED", "CANCELED"]).optional().describe("Filter by state"),
      }),
      execute: async (args) => {
        const params = new URLSearchParams({ limit: String(args.limit) });
        if (agent.vercelProjectId) params.set("projectId", agent.vercelProjectId);
        if (args.state) params.set("state", args.state);
        const raw = await agent.vercelAPI(`/v6/deployments?${params.toString()}`);

        try {
          const data = JSON.parse(raw) as { deployments?: VercelDeployment[] };
          if (!data.deployments?.length) return "No Vercel deployments found.";
          return data.deployments.map((d) => [
            `URL: https://${d.url}`,
            `State: ${d.state}`,
            `Created: ${new Date(d.createdAt).toISOString()}`,
            d.meta?.githubCommitRef ? `Branch: ${d.meta.githubCommitRef}` : null,
            d.meta?.githubPrId ? `PR: #${d.meta.githubPrId}` : null,
          ].filter(Boolean).join(" | ")).join("\n");
        } catch {
          return raw;
        }
      },
    });

    const getVercelDeploymentByPRTool = tool({
      name: "get_vercel_deployment_by_pr",
      description: "Find the Vercel preview deployment associated with a specific PR number",
      parameters: z.object({
        prNumber: z.number().describe("PR number to find deployment for"),
      }),
      execute: async (args) => {
        const params = new URLSearchParams({ limit: "20" });
        if (agent.vercelProjectId) params.set("projectId", agent.vercelProjectId);
        const raw = await agent.vercelAPI(`/v6/deployments?${params.toString()}`);

        try {
          const data = JSON.parse(raw) as { deployments?: VercelDeployment[] };
          const prDeployment = data.deployments?.find((d) =>
            d.meta?.githubPrId === String(args.prNumber)
          );
          if (!prDeployment) return `No Vercel deployment found for PR #${args.prNumber}.`;
          return JSON.stringify({
            url: `https://${prDeployment.url}`,
            state: prDeployment.state,
            createdAt: new Date(prDeployment.createdAt).toISOString(),
          }, null, 2);
        } catch {
          return raw;
        }
      },
    });

    const checkPreviewHealthTool = tool({
      name: "check_preview_health",
      description: "Health-check a preview deployment URL by issuing an HTTP HEAD request",
      parameters: z.object({
        url: z.string().describe("Preview deployment URL to health-check"),
      }),
      execute: async (args) => {
        try {
          const response = await fetch(args.url, {
            method: "HEAD",
            signal: AbortSignal.timeout(10_000),
          });
          return `Preview URL ${args.url}: ${response.status} ${response.statusText}`;
        } catch (err) {
          return `Preview URL check failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });

    const triggerRedeployTool = tool({
      name: "trigger_redeploy",
      description: "Trigger a redeployment of a specific Vercel deployment (creates a new deployment from the same source)",
      parameters: z.object({
        deploymentId: z.string().describe("Vercel deployment UID to redeploy"),
        reason: z.string().describe("Reason for redeployment"),
      }),
      execute: async (args) => {
        agent.deps.auditLogger.log({
          agentId: "deploy",
          action: "redeploy_triggered",
          details: { deploymentId: args.deploymentId, reason: args.reason },
          rationale: `Triggering redeployment: ${args.reason}`,
        });
        return agent.vercelAPI(`/v13/deployments/${args.deploymentId}/redeploy`, "POST");
      },
    });

    const getAgentReviewHistoryTool = tool({
      name: "get_agent_review_history",
      description: "Get the review history from other agents for this task",
      parameters: z.object({
        taskId: z.string().describe("Task ID to check"),
      }),
      execute: async (args) => {
        const entries = this.deps.auditLogger.getEntries({ taskId: args.taskId, limit: 50 });
        const reviews = entries
          .filter((e) => e.action.includes("review") || e.action.includes("validation") || e.action.includes("verdict"))
          .map((e) => ({
            agent: e.agentId,
            action: e.action,
            rationale: e.rationale,
            timestamp: e.timestamp,
          }));
        return JSON.stringify(reviews, null, 2);
      },
    });

    const submitAssessmentTool = tool({
      name: "submit_assessment",
      description: "Submit the deployment readiness assessment",
      parameters: z.object({
        deploymentReady: z.boolean(),
        previewUrl: z.string().optional(),
        previewHealthy: z.boolean().optional(),
        safetyChecks: z.object({
          architect: z.enum(["pass", "fail", "pending"]),
          qa: z.enum(["pass", "fail", "pending"]),
          supabase: z.enum(["pass", "fail", "pending", "not_applicable"]),
        }),
        recommendation: z.enum(["PROMOTE", "HOLD", "ROLLBACK"]),
        reason: z.string(),
        summary: z.string(),
      }),
      execute: async (args) => {
        return JSON.stringify(args);
      },
    });

    return [
      this.buildReadFileTool(),
      checkDeploymentStatusTool,
      listVercelDeploymentsTool,
      getVercelDeploymentByPRTool,
      checkPreviewHealthTool,
      triggerRedeployTool,
      getAgentReviewHistoryTool,
      submitAssessmentTool,
    ];
  }

  protected async runAgent(context: AgentContext): Promise<SubtaskResult> {
    const agent = this.createAgent(context);

    const input = [
      `Assess deployment readiness for issue #${context.task.githubIssueNumber}: ${context.task.title}`,
      context.task.prNumber ? `PR #${context.task.prNumber} is open.` : "No PR yet.",
      "",
      "Steps:",
      "1. Check GitHub deployment status",
      context.task.prNumber
        ? "2. Use get_vercel_deployment_by_pr to find the preview deployment for this PR"
        : "2. Use list_vercel_deployments to check recent deployments",
      "3. If a preview URL is found, use check_preview_health to verify it responds with 200",
      `4. Get agent review history for task "${context.task.id}" to check all safety gates`,
      "5. Submit your assessment with safety checks, preview health, and recommendation",
      "",
      "IMPORTANT: Never recommend PROMOTE unless all safety checks pass AND the preview is healthy.",
    ].join("\n");

    const output = await this.executeAgent(agent, input, context);

    let parsed: { recommendation?: string; previewUrl?: string; previewHealthy?: boolean; summary?: string };
    try {
      parsed = JSON.parse(output);
    } catch {
      parsed = { recommendation: "HOLD", summary: output };
    }

    const recommendation = parsed.recommendation ?? "HOLD";

    if (context.task.prNumber) {
      const label = recommendation === "PROMOTE" ? "Ready" : recommendation === "HOLD" ? "Hold" : "Rollback";
      const previewInfo = parsed.previewUrl
        ? `\n**Preview**: [${parsed.previewUrl}](${parsed.previewUrl}) (${parsed.previewHealthy ? "healthy" : "unhealthy"})`
        : "";
      await this.deps.github.addPRReviewComment(
        context.task.prNumber,
        `## Deploy Agent Assessment\n\n**Recommendation**: ${label}${previewInfo}\n\n${parsed.summary ?? output}`
      );
    }

    this.deps.auditLogger.log({
      agentId: this.role,
      action: "deployment_assessment",
      details: { recommendation, prNumber: context.task.prNumber, previewHealthy: parsed.previewHealthy },
      taskId: context.task.id,
      subtaskId: context.subtask.id,
      rationale: `Deployment recommendation: ${recommendation}`,
    });

    return {
      success: recommendation !== "ROLLBACK",
      summary: `Deployment assessment: ${recommendation}. ${parsed.summary ?? ""}`,
      prComments: context.task.prNumber ? [output] : undefined,
    };
  }
}
