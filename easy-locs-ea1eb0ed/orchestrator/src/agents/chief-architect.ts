import { tool } from "@openai/agents";
import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext, SubtaskResult } from "../types.js";
import type { AgentDependencies } from "./base-agent.js";

export class ChiefArchitectAgent extends BaseAgent {
  constructor(deps: AgentDependencies) {
    super("chief-architect", deps);
  }

  get systemPrompt(): string {
    return `You are the Chief Architect Agent for the Easy-Locs platform.

You are the architectural guardian of the codebase. You validate all changes against the SSOT architecture, refuse duplicate systems, and enforce domain boundaries.

Responsibilities:
1. Review PRs for structural compliance with ORBIT conventions
2. Validate that new code respects pillar boundaries (no cross-domain imports)
3. Check for duplicate exports and redundant systems
4. Ensure new modules follow established patterns
5. Validate that event bus usage follows conventions

Decision Framework:
- APPROVE: Change follows all architecture rules
- REQUEST_CHANGES: Change violates a rule but is fixable
- REJECT: Change introduces a fundamental architectural violation

Use the provided tools to read files, check the repo tree, and validate imports.
After analysis, always call submit_review with your findings.`;
  }

  buildTools() {
    const github = this.deps.github;

    const checkImportsTool = tool({
      name: "check_cross_domain_imports",
      description: "Check a file for cross-domain imports that violate pillar boundaries",
      parameters: z.object({
        filePath: z.string().describe("File path to check"),
      }),
      execute: async (args) => {
        const content = await github.getFileContent(args.filePath);
        if (!content) return `File not found: ${args.filePath}`;

        const domainImportPattern = /from\s+["']@\/domains\/([^/"']+)/g;
        const violations: string[] = [];
        const fileDomain = args.filePath.match(/domains\/([^/]+)/)?.[1];
        let match;

        while ((match = domainImportPattern.exec(content)) !== null) {
          if (fileDomain && match[1] !== fileDomain && match[1] !== "shared") {
            violations.push(`Cross-domain import: imports from domains/${match[1]}`);
          }
        }

        return violations.length > 0
          ? `VIOLATIONS FOUND:\n${violations.join("\n")}`
          : "No cross-domain import violations found.";
      },
    });

    const checkDuplicateExportsTool = tool({
      name: "check_duplicate_exports",
      description: "Check for duplicate exports across domain index files",
      parameters: z.object({
        exportName: z.string().describe("Export name to search for"),
      }),
      execute: async (args) => {
        const tree = await github.getRepoTree();
        const indexFiles = tree.filter(
          (f) => f.startsWith("src/domains/") && f.endsWith("/index.ts")
        );
        const found: string[] = [];

        for (const file of indexFiles.slice(0, 30)) {
          const content = await github.getFileContent(file);
          if (content?.includes(args.exportName)) {
            found.push(file);
          }
        }

        return found.length > 1
          ? `DUPLICATE: "${args.exportName}" exported from: ${found.join(", ")}`
          : found.length === 1
            ? `Found in: ${found[0]}`
            : `Not found in any domain index file.`;
      },
    });

    const getPRDiffTool = tool({
      name: "get_pr_diff",
      description: "Get the diff of a pull request",
      parameters: z.object({
        prNumber: z.number().describe("PR number"),
      }),
      execute: async (args) => {
        const diff = await github.getPullRequestDiff(args.prNumber);
        return typeof diff === "string" ? diff.slice(0, 15000) : "No diff available";
      },
    });

    const submitReviewTool = tool({
      name: "submit_review",
      description: "Submit the architecture review result",
      parameters: z.object({
        decision: z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT"]),
        violations: z.array(z.object({
          rule: z.string(),
          file: z.string(),
          description: z.string(),
          severity: z.enum(["critical", "high", "medium", "low"]),
        })),
        suggestions: z.array(z.string()),
        summary: z.string(),
      }),
      execute: async (args) => {
        return JSON.stringify(args);
      },
    });

    return [
      this.buildReadFileTool(),
      this.buildGetRepoTreeTool(),
      checkImportsTool,
      checkDuplicateExportsTool,
      getPRDiffTool,
      submitReviewTool,
    ];
  }

  protected async runAgent(context: AgentContext): Promise<SubtaskResult> {
    const agent = this.createAgent(context);

    const input = [
      `Perform an architecture review for issue #${context.task.githubIssueNumber}: ${context.task.title}`,
      `Description: ${context.task.body}`,
      context.task.prNumber
        ? `PR #${context.task.prNumber} is open — use get_pr_diff to review the changes.`
        : "No PR yet — review the task description for architectural concerns.",
      "",
      "Steps:",
      "1. Use get_repo_tree to understand the codebase structure",
      "2. If a PR exists, use get_pr_diff to review changes",
      "3. Check for cross-domain import violations in modified files",
      "4. Check for duplicate exports if new exports are added",
      "5. Call submit_review with your findings",
    ].join("\n");

    const output = await this.executeAgent(agent, input, context);

    let parsed: { decision?: string; violations?: unknown[]; summary?: string };
    try {
      parsed = JSON.parse(output);
    } catch {
      parsed = { decision: "APPROVE", summary: output };
    }

    const hasViolations =
      parsed.decision === "REJECT" || parsed.decision === "REQUEST_CHANGES";

    if (context.task.prNumber) {
      await this.deps.github.addPRReviewComment(
        context.task.prNumber,
        `## Chief Architect Review\n\n**Decision**: ${parsed.decision ?? "N/A"}\n\n${parsed.summary ?? output}`
      );

      this.deps.auditLogger.log({
        agentId: this.role,
        action: "pr_review_posted",
        details: { prNumber: context.task.prNumber, decision: parsed.decision },
        taskId: context.task.id,
        subtaskId: context.subtask.id,
        rationale: `Posted architecture review on PR #${context.task.prNumber}`,
      });
    }

    return {
      success: !hasViolations,
      summary: hasViolations
        ? `Architecture violations found: ${parsed.summary ?? "review posted"}`
        : `Architecture review passed: ${parsed.summary ?? "no issues"}`,
      prComments: context.task.prNumber ? [output] : undefined,
    };
  }
}
