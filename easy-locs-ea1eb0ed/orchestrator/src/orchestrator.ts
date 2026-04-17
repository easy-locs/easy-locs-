// LB1 #835 — This is the legacy dev/build orchestrator (Level C, code-gen).
// It speaks to OpenAI directly because it is NOT a runtime user-facing AI
// surface; every model call here is a developer-tooling call (PR analysis,
// code-gen). Migration onto `dispatchExecutionTask({ domain: 'ai', ... })`
// is tracked under the Level C roadmap (LC1) — once the dev orchestrator is
// itself a registered platform agent, these calls will route through the
// AI adapter like every other surface. Until then, this file is the ONLY
// sanctioned exception to the "no direct model SDKs" rule and MUST NOT be
// referenced from the runtime app.
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import type {
  OrchestratorConfig,
  Task,
  Subtask,
  WebhookEvent,
  AgentContext,
  AgentRole,
} from "./types.js";
import { AuditLogger } from "./audit-logger.js";
import { CostControls } from "./cost-controls.js";
import { GitHubClient } from "./github/github-client.js";
import { TaskDecomposer } from "./task-decomposition.js";
import { TaskStore } from "./task-store.js";
import { RateLimiter } from "./rate-limiter.js";
import {
  ChiefArchitectAgent,
  CodingAgent,
  QAValidationAgent,
  SupabaseAgent,
  DeployAgent,
  ObservabilityAgent,
} from "./agents/index.js";
import type { BaseAgent, AgentDependencies } from "./agents/index.js";

export class Orchestrator {
  private config: OrchestratorConfig;
  private github: GitHubClient;
  private auditLogger: AuditLogger;
  private costControls: CostControls;
  private decomposer: TaskDecomposer;
  private agents: Map<AgentRole, BaseAgent>;
  private taskStore: TaskStore;
  private rateLimiter: RateLimiter;
  private repoRules: Record<string, string> = {};
  private taskCounter = 0;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.github = new GitHubClient(config);
    this.auditLogger = new AuditLogger();
    this.costControls = new CostControls(config.costBudget);
    this.taskStore = new TaskStore();
    this.rateLimiter = new RateLimiter();

    const openai = new OpenAI({ apiKey: config.openaiApiKey });

    this.decomposer = new TaskDecomposer({
      openai,
      model: config.openaiModel,
      auditLogger: this.auditLogger,
      costControls: this.costControls,
    });

    const deps: AgentDependencies = {
      github: this.github,
      auditLogger: this.auditLogger,
      costControls: this.costControls,
      model: config.openaiModel,
      repoRules: this.repoRules,
    };

    this.agents = new Map<AgentRole, BaseAgent>([
      ["chief-architect", new ChiefArchitectAgent(deps)],
      ["coding", new CodingAgent(deps)],
      ["qa-validation", new QAValidationAgent(deps)],
      [
        "supabase",
        new SupabaseAgent(deps, {
          supabaseUrl: config.supabaseUrl,
          supabaseServiceKey: config.supabaseServiceKey,
          supabaseProjectRef: config.supabaseProjectRef,
          supabaseManagementToken: config.supabaseManagementToken,
        }),
      ],
      ["deploy", new DeployAgent(deps, {
        vercelToken: config.vercelToken,
        vercelProjectId: config.vercelProjectId,
        vercelTeamId: config.vercelTeamId,
      })],
      ["observability", new ObservabilityAgent(deps, {
        vercelToken: config.vercelToken,
        vercelProjectId: config.vercelProjectId,
        vercelTeamId: config.vercelTeamId,
        supabaseUrl: config.supabaseUrl,
        supabaseServiceKey: config.supabaseServiceKey,
      })],
    ]);

    this.costControls.onAlert((message) => {
      console.warn(`[orchestrator] Cost alert: ${message}`);
    });
  }

  async initialize(): Promise<void> {
    console.log("[orchestrator] Loading repo rules...");
    this.loadRepoRules();
    console.log(
      `[orchestrator] Loaded ${Object.keys(this.repoRules).length} rule files`
    );
    console.log(
      `[orchestrator] Restored ${this.taskStore.size} tasks from persistent store`
    );

    this.logIntegrationReadiness();

    this.auditLogger.log({
      agentId: "chief-architect",
      action: "orchestrator_initialized",
      details: {
        agents: [...this.agents.keys()],
        ruleFiles: Object.keys(this.repoRules),
        model: this.config.openaiModel,
        restoredTasks: this.taskStore.size,
      },
      rationale: "Orchestrator started and initialized all agents",
    });
  }

  private logIntegrationReadiness(): void {
    const checks: Array<{ name: string; configured: boolean; envVars: string[] }> = [
      {
        name: "Supabase Management API",
        configured: !!(this.config.supabaseProjectRef && this.config.supabaseManagementToken),
        envVars: ["SUPABASE_PROJECT_REF", "SUPABASE_MANAGEMENT_TOKEN"],
      },
      {
        name: "Supabase REST API",
        configured: !!(this.config.supabaseUrl && this.config.supabaseServiceKey),
        envVars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      },
      {
        name: "Vercel API",
        configured: !!this.config.vercelToken,
        envVars: ["VERCEL_TOKEN"],
      },
      {
        name: "Webhook Command Auth",
        configured: !!(process.env["ORCHESTRATOR_ADMINS"]),
        envVars: ["ORCHESTRATOR_ADMINS"],
      },
    ];

    console.log("[orchestrator] Integration readiness:");
    for (const check of checks) {
      const status = check.configured ? "READY" : "NOT CONFIGURED";
      const level = check.configured ? "info" : "warn";
      const msg = `  ${check.name}: ${status}`;
      if (level === "warn") {
        console.warn(`${msg} (set ${check.envVars.join(", ")} to enable)`);
      } else {
        console.log(msg);
      }
    }

    if (!checks.find((c) => c.name === "Supabase Management API")?.configured) {
      console.warn("[orchestrator] WARNING: Supabase Management API not configured — live schema/RLS validation will be unavailable. Set SUPABASE_PROJECT_REF and SUPABASE_MANAGEMENT_TOKEN.");
    }
    if (!checks.find((c) => c.name === "Webhook Command Auth")?.configured) {
      console.warn("[orchestrator] WARNING: ORCHESTRATOR_ADMINS not set — all /orchestrator commands will be DENIED (deny-by-default).");
    }
  }

  private loadRepoRules(): void {
    const rulesDir = path.resolve(
      import.meta.dirname ?? ".",
      "../../.agents/rules"
    );

    if (!fs.existsSync(rulesDir)) {
      console.warn(`[orchestrator] Rules directory not found: ${rulesDir}`);
      return;
    }

    const files = fs.readdirSync(rulesDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        const name = file.replace(".md", "");
        this.repoRules[name] = fs.readFileSync(
          path.join(rulesDir, file),
          "utf-8"
        );
      }
    }
  }

  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    this.auditLogger.log({
      agentId: "chief-architect",
      action: "webhook_received",
      details: { type: event.type, sender: event.sender },
      rationale: `Received ${event.type} webhook from ${event.sender}`,
    });

    switch (event.type) {
      case "issue_opened":
        await this.handleNewIssue(event);
        break;
      case "issue_comment":
        await this.handleIssueComment(event);
        break;
      case "pr_opened":
        await this.handlePROpened(event);
        break;
      case "pr_review":
        await this.handlePRReview(event);
        break;
      case "pr_merged":
        await this.handlePRMerged(event);
        break;
    }
  }

  private async handleNewIssue(event: WebhookEvent): Promise<void> {
    const issue = event.payload.issue as {
      number: number;
      title: string;
      body: string;
      labels: Array<{ name: string }>;
    };

    if (!issue) return;

    const hasAgentLabel = issue.labels?.some(
      (l) => l.name === "agent-task" || l.name === "auto-process"
    );
    if (!hasAgentLabel) {
      console.log(
        `[orchestrator] Issue #${issue.number} skipped — no agent-task label`
      );
      return;
    }

    const task = this.createTask(issue);
    this.taskStore.set(task);

    await this.github.addIssueComment(
      issue.number,
      [
        `## Orchestrator Acknowledged`,
        ``,
        `Task **${task.id}** created. Decomposing into subtasks...`,
        ``,
        `| Agent | Status |`,
        `|-------|--------|`,
        `| Chief Architect | Pending |`,
        `| Coding | Pending |`,
        `| QA Validation | Pending |`,
        `| Supabase | Pending |`,
        `| Deploy | Pending |`,
        `| Observability | Pending |`,
        ``,
        `> Human approval will be required before any merge.`,
      ].join("\n")
    );

    await this.processTask(task);
  }

  private async handleIssueComment(event: WebhookEvent): Promise<void> {
    const comment = event.payload.comment as {
      body: string;
      user: { login: string };
    };
    const issue = event.payload.issue as { number: number };

    if (!comment || !issue) return;

    if (comment.body.toLowerCase().includes("/orchestrator status")) {
      const task = this.taskStore.findByIssueNumber(issue.number);

      if (task) {
        await this.github.addIssueComment(issue.number, this.formatTaskStatus(task));
      } else {
        await this.github.addIssueComment(
          issue.number,
          "No active orchestrator task found for this issue."
        );
      }
    }

    if (comment.body.toLowerCase().includes("/orchestrator retry")) {
      const task = this.taskStore.findByIssueNumber(issue.number);

      if (task) {
        const failedSubtasks = task.subtasks.filter(
          (s) => s.status === "failed"
        );
        for (const subtask of failedSubtasks) {
          subtask.status = "pending";
          subtask.result = undefined;
        }
        this.taskStore.set(task);
        await this.processTask(task);
      }
    }
  }

  private async handlePROpened(event: WebhookEvent): Promise<void> {
    const pr = event.payload.pull_request as {
      number: number;
      title: string;
      body: string;
    };
    if (!pr) return;

    let task = this.taskStore.findByPRNumber(pr.number);

    if (!task) {
      const issueMatch = pr.body?.match(/#(\d+)/);
      if (issueMatch) {
        const issueNum = parseInt(issueMatch[1], 10);
        task = this.taskStore.findByIssueNumber(issueNum);
        if (task) {
          task.prNumber = pr.number;
          this.taskStore.set(task);
        }
      }
    }

    if (!task) return;

    const reviewSubtasks: Subtask[] = [
      {
        id: `st-${task.id}-review-arch`,
        parentTaskId: task.id,
        title: "Architecture review of PR",
        description: `Review PR #${pr.number} for architectural compliance`,
        assignedAgent: "chief-architect",
        status: "pending",
        dependencies: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: `st-${task.id}-review-qa`,
        parentTaskId: task.id,
        title: "QA validation of PR",
        description: `Validate PR #${pr.number} for quality and safety`,
        assignedAgent: "qa-validation",
        status: "pending",
        dependencies: [`st-${task.id}-review-arch`],
        createdAt: new Date().toISOString(),
      },
      {
        id: `st-${task.id}-review-deploy`,
        parentTaskId: task.id,
        title: "Deployment readiness check",
        description: `Assess deployment readiness for PR #${pr.number}`,
        assignedAgent: "deploy",
        status: "pending",
        dependencies: [`st-${task.id}-review-qa`],
        createdAt: new Date().toISOString(),
      },
    ];

    task.subtasks.push(...reviewSubtasks);
    this.taskStore.set(task);
    await this.processTask(task);
  }

  private async handlePRReview(_event: WebhookEvent): Promise<void> {
    // Human reviews are tracked via audit log but not auto-processed
  }

  private async handlePRMerged(event: WebhookEvent): Promise<void> {
    const pr = event.payload.pull_request as { number: number };
    if (!pr) return;

    const task = this.taskStore.findByPRNumber(pr.number);
    if (task) {
      task.status = "merged";

      const observeSubtask: Subtask = {
        id: `st-${task.id}-post-merge`,
        parentTaskId: task.id,
        title: "Post-merge observability check",
        description: `Monitor health after merging PR #${pr.number}`,
        assignedAgent: "observability",
        status: "pending",
        dependencies: [],
        createdAt: new Date().toISOString(),
      };

      task.subtasks.push(observeSubtask);
      this.taskStore.set(task);
      await this.executeSubtask(task, observeSubtask);
    }
  }

  private async processTask(task: Task): Promise<void> {
    if (task.subtasks.length === 0) {
      task.status = "decomposing";
      this.taskStore.set(task);
      try {
        const subtasks = await this.decomposer.decompose(task);
        task.subtasks = subtasks;
        task.status = "in-progress";
        this.taskStore.set(task);
      } catch (err) {
        task.status = "failed";
        this.taskStore.set(task);
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[orchestrator] Decomposition failed: ${msg}`);
        await this.github.addIssueComment(
          task.githubIssueNumber,
          `## Decomposition Failed\n\n${msg}`
        );
        return;
      }
    }

    let madeProgress = true;
    while (madeProgress) {
      madeProgress = false;

      for (const subtask of task.subtasks) {
        if (subtask.status !== "pending") continue;

        const depsFailed = subtask.dependencies.some((depId) => {
          const dep = task.subtasks.find((s) => s.id === depId);
          return dep?.status === "failed";
        });

        if (depsFailed) {
          subtask.status = "blocked";
          subtask.result = {
            success: false,
            summary: "Skipped: upstream dependency failed",
            errors: ["Blocked by failed dependency"],
          };
          subtask.completedAt = new Date().toISOString();
          this.taskStore.set(task);
          madeProgress = true;
          continue;
        }

        const depsReady = subtask.dependencies.every((depId) => {
          const dep = task.subtasks.find((s) => s.id === depId);
          return dep?.status === "completed";
        });

        if (!depsReady) continue;

        await this.executeSubtask(task, subtask);
        madeProgress = true;
      }
    }

    const allDone = task.subtasks.every(
      (s) => s.status === "completed" || s.status === "failed" || s.status === "blocked"
    );
    if (allDone) {
      const anyFailed = task.subtasks.some((s) => s.status === "failed" || s.status === "blocked");
      task.status = anyFailed ? "failed" : "awaiting-review";
      this.taskStore.set(task);

      await this.github.addIssueComment(
        task.githubIssueNumber,
        this.formatTaskStatus(task)
      );
    }
  }

  private async executeSubtask(task: Task, subtask: Subtask): Promise<void> {
    const agent = this.agents.get(subtask.assignedAgent);
    if (!agent) {
      subtask.status = "failed";
      subtask.result = {
        success: false,
        summary: `Unknown agent: ${subtask.assignedAgent}`,
        errors: [`No agent registered for role: ${subtask.assignedAgent}`],
      };
      this.taskStore.set(task);
      return;
    }

    const rateCheck = this.rateLimiter.checkAgentRun(subtask.assignedAgent);
    if (!rateCheck.allowed) {
      console.warn(`[orchestrator] Rate limit hit for agent ${subtask.assignedAgent}, retrying in ${rateCheck.retryAfterMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, rateCheck.retryAfterMs ?? 5000));
    }

    subtask.status = "in-progress";
    this.taskStore.set(task);

    const context: AgentContext = {
      task,
      subtask,
      repoRules: this.repoRules,
      recentAuditLog: this.auditLogger.getEntries({ taskId: task.id, limit: 50 }),
    };

    const result = await agent.execute(context);

    subtask.result = result;
    subtask.status = result.success ? "completed" : "failed";
    subtask.completedAt = new Date().toISOString();
    this.taskStore.set(task);
  }

  private createTask(issue: {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
  }): Task {
    return {
      id: `task-${Date.now()}-${++this.taskCounter}`,
      githubIssueNumber: issue.number,
      githubRepo: `${this.config.githubOwner}/${this.config.githubRepo}`,
      title: issue.title,
      body: issue.body ?? "",
      labels: issue.labels?.map((l) => l.name) ?? [],
      status: "pending",
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private formatTaskStatus(task: Task): string {
    const lines = [
      `## Task Status: ${task.id}`,
      `**Status**: ${task.status}`,
      ``,
      `| # | Subtask | Agent | Status | Result |`,
      `|---|---------|-------|--------|--------|`,
    ];

    for (let i = 0; i < task.subtasks.length; i++) {
      const s = task.subtasks[i];
      const statusLabel =
        s.status === "completed"
          ? "Done"
          : s.status === "failed"
            ? "Failed"
            : s.status === "in-progress"
              ? "Running"
              : "Pending";
      lines.push(
        `| ${i + 1} | ${s.title} | ${s.assignedAgent} | ${statusLabel} | ${s.result?.summary ?? "—"} |`
      );
    }

    const budget = this.costControls.getStatus();
    lines.push(
      ``,
      `**Cost**: $${budget.currentDailyUsd.toFixed(4)} daily / $${budget.currentMonthlyUsd.toFixed(4)} monthly`
    );

    return lines.join("\n");
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  getCostControls(): CostControls {
    return this.costControls;
  }

  getTaskStore(): TaskStore {
    return this.taskStore;
  }

  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }
}
