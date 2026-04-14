import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import type {
  AgentRole,
  AgentContext,
  SubtaskResult,
  TokenUsage,
} from "../types.js";
import type { AuditLogger } from "../audit-logger.js";
import type { CostControls } from "../cost-controls.js";
import type { GitHubClient } from "../github/github-client.js";

export interface AgentDependencies {
  github: GitHubClient;
  auditLogger: AuditLogger;
  costControls: CostControls;
  model: string;
  repoRules: Record<string, string>;
}

export abstract class BaseAgent {
  readonly role: AgentRole;
  protected deps: AgentDependencies;

  constructor(role: AgentRole, deps: AgentDependencies) {
    this.role = role;
    this.deps = deps;
  }

  abstract get systemPrompt(): string;

  abstract buildTools(): ReturnType<typeof tool>[];

  async execute(context: AgentContext): Promise<SubtaskResult> {
    const budgetCheck = this.deps.costControls.checkBudget();
    if (!budgetCheck.allowed) {
      this.deps.auditLogger.log({
        agentId: this.role,
        action: "budget_exceeded",
        details: { reason: budgetCheck.reason },
        taskId: context.task.id,
        subtaskId: context.subtask.id,
        rationale: `Blocked by cost controls: ${budgetCheck.reason}`,
      });
      return {
        success: false,
        summary: `Budget limit reached: ${budgetCheck.reason}`,
        errors: [budgetCheck.reason!],
      };
    }

    const startTime = Date.now();

    this.deps.auditLogger.log({
      agentId: this.role,
      action: "subtask_started",
      details: {
        subtaskId: context.subtask.id,
        title: context.subtask.title,
      },
      taskId: context.task.id,
      subtaskId: context.subtask.id,
      rationale: `Starting subtask: ${context.subtask.title}`,
    });

    try {
      const result = await this.runAgent(context);
      const durationMs = Date.now() - startTime;

      this.deps.auditLogger.log({
        agentId: this.role,
        action: result.success ? "subtask_completed" : "subtask_failed",
        details: {
          summary: result.summary,
          filesModified: result.filesModified,
          errors: result.errors,
        },
        taskId: context.task.id,
        subtaskId: context.subtask.id,
        rationale: result.summary,
        durationMs,
      });

      return result;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      this.deps.auditLogger.log({
        agentId: this.role,
        action: "subtask_error",
        details: { error: errorMsg },
        taskId: context.task.id,
        subtaskId: context.subtask.id,
        rationale: `Unexpected error: ${errorMsg}`,
        durationMs,
      });

      return {
        success: false,
        summary: `Agent error: ${errorMsg}`,
        errors: [errorMsg],
      };
    }
  }

  protected abstract runAgent(context: AgentContext): Promise<SubtaskResult>;

  protected createAgent(context: AgentContext): Agent {
    const rulesContext = Object.entries(this.deps.repoRules)
      .map(([name, content]) => `## ${name}\n${content}`)
      .join("\n\n---\n\n");

    const instructions = [
      this.systemPrompt,
      "",
      "# Repository Rules",
      "",
      rulesContext,
      "",
      "# Current Task Context",
      `Issue #${context.task.githubIssueNumber}: ${context.task.title}`,
      `Subtask: ${context.subtask.title}`,
      context.subtask.description,
    ].join("\n");

    return new Agent({
      name: this.role,
      instructions,
      model: this.deps.model,
      tools: this.buildTools(),
    });
  }

  protected async executeAgent(
    agent: Agent,
    input: string,
    context: AgentContext
  ): Promise<string> {
    const result = await run(agent, input);

    const usage = (result as unknown as Record<string, unknown>).usage as
      | { requests?: Array<{ inputTokens?: number; outputTokens?: number }> }
      | undefined;

    if (usage) {
      const tokenUsage: TokenUsage = this.deps.costControls.buildTokenUsage(
        this.deps.model,
        usage.requests?.[0]?.inputTokens ?? 0,
        usage.requests?.[0]?.outputTokens ?? 0
      );
      this.deps.costControls.recordUsage(tokenUsage);

      this.deps.auditLogger.log({
        agentId: this.role,
        action: "agent_run",
        details: {
          model: this.deps.model,
          inputTokens: usage.requests?.[0]?.inputTokens ?? 0,
          outputTokens: usage.requests?.[0]?.outputTokens ?? 0,
          costUsd: tokenUsage.estimatedCostUsd,
        },
        taskId: context.task.id,
        subtaskId: context.subtask.id,
        rationale: "OpenAI Agents SDK run completed",
        tokenUsage,
      });
    }

    return result.finalOutput ?? "";
  }

  protected buildReadFileTool() {
    const github = this.deps.github;
    return tool({
      name: "read_file",
      description: "Read a file from the repository. Returns the file content as a string.",
      parameters: z.object({
        path: z.string().describe("File path relative to repository root"),
        ref: z.string().optional().describe("Git ref (branch/tag/sha). Defaults to main."),
      }),
      execute: async (args) => {
        const content = await github.getFileContent(args.path, args.ref);
        return content ?? `File not found: ${args.path}`;
      },
    });
  }

  protected buildGetRepoTreeTool() {
    const github = this.deps.github;
    return tool({
      name: "get_repo_tree",
      description: "Get the file tree of the repository. Returns a list of all file paths.",
      parameters: z.object({
        ref: z.string().optional().describe("Git ref. Defaults to main."),
        pathPrefix: z.string().optional().describe("Filter files starting with this prefix"),
      }),
      execute: async (args) => {
        const tree = await github.getRepoTree(args.ref ?? "main");
        const filtered = args.pathPrefix
          ? tree.filter((f) => f.startsWith(args.pathPrefix!))
          : tree;
        return filtered.slice(0, 500).join("\n");
      },
    });
  }
}
