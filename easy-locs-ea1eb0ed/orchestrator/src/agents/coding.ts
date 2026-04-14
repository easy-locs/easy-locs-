import { tool } from "@openai/agents";
import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext, SubtaskResult } from "../types.js";
import type { AgentDependencies } from "./base-agent.js";

export class CodingAgent extends BaseAgent {
  constructor(deps: AgentDependencies) {
    super("coding", deps);
  }

  get systemPrompt(): string {
    return `You are the Coding Agent for the Easy-Locs platform.

You implement code changes on dedicated branches, generate clean commits, and open PRs with structured descriptions.

Workflow:
1. Use create_branch to create a feature branch
2. Use read_file to understand existing code before making changes
3. Use write_file to create or modify files on the branch
4. Once all files are written, use create_pull_request to open a PR

Code Standards:
- TypeScript strict mode
- Use interface for object shapes, type for unions
- Functions under 50 lines
- Follow existing patterns in the file being modified
- Use ORBIT bus for cross-domain communication
- Branch naming: agent/coding/<issue>-<description>
- Commit messages: conventional commits format

Always implement the actual code changes. Never leave placeholder or TODO comments.`;
  }

  buildTools() {
    const github = this.deps.github;
    const auditLogger = this.deps.auditLogger;
    const role = this.role;

    const createBranchTool = tool({
      name: "create_branch",
      description: "Create a new git branch from main",
      parameters: z.object({
        branchName: z.string().describe("Branch name, e.g. agent/coding/123-add-feature"),
        fromRef: z.string().optional().describe("Base ref, defaults to main"),
      }),
      execute: async (args) => {
        try {
          await github.createBranch(args.branchName, args.fromRef ?? "main");
          auditLogger.log({
            agentId: role,
            action: "branch_created",
            details: { branchName: args.branchName },
            rationale: `Created branch ${args.branchName}`,
          });
          return `Branch "${args.branchName}" created successfully.`;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("Reference already exists")) {
            return `Branch "${args.branchName}" already exists. You can write files to it.`;
          }
          return `Failed to create branch: ${msg}`;
        }
      },
    });

    const writeFileTool = tool({
      name: "write_file",
      description: "Create or update a file on a branch with a commit",
      parameters: z.object({
        path: z.string().describe("File path relative to repository root"),
        content: z.string().describe("Full file content to write"),
        commitMessage: z.string().describe("Commit message in conventional commits format"),
        branch: z.string().describe("Branch to commit to"),
      }),
      execute: async (args) => {
        await github.createOrUpdateFile({
          path: args.path,
          content: args.content,
          message: args.commitMessage,
          branch: args.branch,
        });

        auditLogger.log({
          agentId: role,
          action: "file_written",
          details: { path: args.path, branch: args.branch, commitMessage: args.commitMessage },
          rationale: `Wrote file ${args.path} on branch ${args.branch}`,
        });

        return `File "${args.path}" written and committed to branch "${args.branch}".`;
      },
    });

    const createPRTool = tool({
      name: "create_pull_request",
      description: "Open a pull request from a branch",
      parameters: z.object({
        title: z.string().describe("PR title"),
        body: z.string().describe("PR description with What, Why, Changes, Testing sections"),
        head: z.string().describe("Source branch name"),
        base: z.string().optional().describe("Target branch, defaults to main"),
      }),
      execute: async (args) => {
        const pr = await github.createPullRequest({
          title: args.title,
          body: args.body + "\n\n> This PR requires human approval before merging.",
          head: args.head,
          base: args.base ?? "main",
          labels: ["agent-generated", "needs-review"],
        });

        auditLogger.log({
          agentId: role,
          action: "pr_created",
          details: { prNumber: pr.number, head: args.head },
          rationale: `Opened PR #${pr.number}`,
        });

        return JSON.stringify({ prNumber: pr.number, url: pr.html_url });
      },
    });

    return [
      this.buildReadFileTool(),
      this.buildGetRepoTreeTool(),
      createBranchTool,
      writeFileTool,
      createPRTool,
    ];
  }

  protected async runAgent(context: AgentContext): Promise<SubtaskResult> {
    const agent = this.createAgent(context);
    const branchName = `agent/coding/${context.task.githubIssueNumber}-${this.slugify(context.subtask.title)}`;

    const input = [
      `Implement the following task on branch "${branchName}":`,
      `Issue #${context.task.githubIssueNumber}: ${context.task.title}`,
      `${context.task.body}`,
      "",
      `Subtask: ${context.subtask.title}`,
      `${context.subtask.description}`,
      "",
      "Steps:",
      `1. Create branch "${branchName}" using create_branch`,
      "2. Read relevant existing files to understand context",
      "3. Write all necessary file changes using write_file with proper commit messages",
      "4. Create a pull request using create_pull_request",
    ].join("\n");

    const output = await this.executeAgent(agent, input, context);

    let prNumber: number | undefined;
    try {
      const prMatch = output.match(/"prNumber":\s*(\d+)/);
      if (prMatch) {
        prNumber = parseInt(prMatch[1], 10);
      }
    } catch {
      // output parsing is best-effort
    }

    if (prNumber) {
      context.task.prNumber = prNumber;
      context.task.branchName = branchName;
    }

    const filesWritten = this.deps.auditLogger
      .getRecentForAgent(this.role, 50)
      .filter((e) => e.action === "file_written" && e.taskId === context.task.id)
      .map((e) => (e.details as { path?: string }).path)
      .filter(Boolean) as string[];

    return {
      success: !!prNumber,
      summary: prNumber
        ? `Created branch ${branchName}, wrote ${filesWritten.length} files, opened PR #${prNumber}`
        : `Implementation attempted but PR creation status unclear. Output: ${output.slice(0, 200)}`,
      filesModified: filesWritten,
    };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  }
}
