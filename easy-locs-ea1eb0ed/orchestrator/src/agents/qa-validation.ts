import { tool } from "@openai/agents";
import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext, SubtaskResult } from "../types.js";
import type { AgentDependencies } from "./base-agent.js";

export class QAValidationAgent extends BaseAgent {
  constructor(deps: AgentDependencies) {
    super("qa-validation", deps);
  }

  get systemPrompt(): string {
    return `You are the QA/Validation Agent for the Easy-Locs platform.

You validate code changes against architecture rules, review test coverage, run CI checks, and ensure critical user flows are not broken.

Critical User Flows (must never break):
1. Booking Flow: Create -> Approve -> Pay -> Complete
2. Payment Flow: Checkout -> Stripe/SEPA -> Confirmation -> Receipt
3. Messaging Flow: Thread create -> Send -> Encrypt -> Deliver -> Notify
4. Lease Flow: Create -> Tenant assign -> Rent collect -> Document generate
5. Deal Flow: Create room -> Offer -> Counter-offer -> Accept/Reject

Validation Checklist:
- No cross-domain imports
- Input sanitization on user-facing inputs
- RLS policies for new tables
- Error boundaries around domain modules
- ORBIT events follow naming convention
- No console.log in production code
- Critical flows not impacted
- CI checks pass (lint, type-check, tests)

Use the tools to trigger CI, analyze the PR diff, check files, and submit your verdict.
Always call submit_verdict with your final assessment.`;
  }

  buildTools() {
    const github = this.deps.github;

    const triggerCITool = tool({
      name: "trigger_ci_workflow",
      description: "Trigger the CI/CD workflow (lint, type-check, tests) on a branch via GitHub Actions",
      parameters: z.object({
        branch: z.string().describe("Branch to run CI on"),
        workflowFile: z.string().default("ci.yml").describe("CI workflow file name"),
      }),
      execute: async (args) => {
        try {
          await github.triggerWorkflowDispatch(args.workflowFile, args.branch);
          return `CI workflow '${args.workflowFile}' triggered on branch '${args.branch}'. Use get_ci_results to poll for completion.`;
        } catch (err) {
          return `Failed to trigger CI: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });

    const getCIResultsTool = tool({
      name: "get_ci_results",
      description: "Get the latest CI workflow run results. If a PR number is provided, gets check runs for that PR instead.",
      parameters: z.object({
        prNumber: z.number().optional().describe("PR number to check CI status for"),
        workflowFile: z.string().default("ci.yml").describe("CI workflow file name"),
      }),
      execute: async (args) => {
        if (args.prNumber) {
          const checkRuns = await github.getPRCheckRuns(args.prNumber);
          if (checkRuns.length === 0) return "No CI check runs found for this PR.";
          const lines = checkRuns.map((cr) =>
            `${cr.name}: ${cr.status}${cr.conclusion ? ` (${cr.conclusion})` : ""}`
          );
          const allPassed = checkRuns.every((cr) => cr.conclusion === "success" || cr.status === "queued" || cr.status === "in_progress");
          const anyFailed = checkRuns.some((cr) => cr.conclusion === "failure");
          lines.push("");
          lines.push(anyFailed ? "OVERALL: FAILED" : allPassed ? "OVERALL: PASSED" : "OVERALL: PENDING");
          return lines.join("\n");
        }

        const run = await github.getLatestWorkflowRun(args.workflowFile);
        if (!run) return "No CI runs found.";
        return `Latest CI run #${run.id}: status=${run.status}, conclusion=${run.conclusion ?? "pending"}\nURL: ${run.htmlUrl}`;
      },
    });

    const getPRDiffTool = tool({
      name: "get_pr_diff",
      description: "Get the diff of a pull request for review",
      parameters: z.object({
        prNumber: z.number().describe("PR number"),
      }),
      execute: async (args) => {
        const diff = await github.getPullRequestDiff(args.prNumber);
        return typeof diff === "string" ? diff.slice(0, 15000) : "No diff available";
      },
    });

    const checkSanitizationTool = tool({
      name: "check_input_sanitization",
      description: "Check if a file uses proper input sanitization from security-utils",
      parameters: z.object({
        filePath: z.string().describe("File to check"),
      }),
      execute: async (args) => {
        const content = await github.getFileContent(args.filePath);
        if (!content) return `File not found: ${args.filePath}`;

        const checks = [
          { name: "sanitizeText", found: content.includes("sanitizeText") },
          { name: "sanitizeEmail", found: content.includes("sanitizeEmail") },
          { name: "sanitizePhone", found: content.includes("sanitizePhone") },
          { name: "sanitizeUrl", found: content.includes("sanitizeUrl") },
          { name: "isValidUUID", found: content.includes("isValidUUID") },
          { name: "validateAmount", found: content.includes("validateAmount") },
        ];

        const hasUserInput = /\b(input|form|event\.target|req\.body|req\.query|req\.params)\b/.test(content);
        const hasAnySanitizer = checks.some((c) => c.found);

        if (hasUserInput && !hasAnySanitizer) {
          return `WARNING: File handles user input but no sanitization functions detected.`;
        }

        return `Sanitization check: ${checks.filter((c) => c.found).map((c) => c.name).join(", ") || "none found"}. User input handling: ${hasUserInput ? "yes" : "no"}.`;
      },
    });

    const submitVerdictTool = tool({
      name: "submit_verdict",
      description: "Submit the QA validation verdict",
      parameters: z.object({
        verdict: z.enum(["SAFE", "UNSAFE", "NEEDS_TESTS"]),
        score: z.number().min(0).max(100),
        ciStatus: z.enum(["passed", "failed", "pending", "not_run"]),
        issues: z.array(z.object({
          severity: z.enum(["critical", "high", "medium", "low"]),
          category: z.string(),
          description: z.string(),
          file: z.string().optional(),
        })),
        missingTests: z.array(z.string()),
        criticalFlowImpact: z.array(z.object({
          flow: z.string(),
          risk: z.string(),
        })),
        summary: z.string(),
      }),
      execute: async (args) => {
        return JSON.stringify(args);
      },
    });

    return [
      this.buildReadFileTool(),
      this.buildGetRepoTreeTool(),
      triggerCITool,
      getCIResultsTool,
      getPRDiffTool,
      checkSanitizationTool,
      submitVerdictTool,
    ];
  }

  protected async runAgent(context: AgentContext): Promise<SubtaskResult> {
    const agent = this.createAgent(context);

    const input = [
      `Perform QA validation for issue #${context.task.githubIssueNumber}: ${context.task.title}`,
      context.task.prNumber
        ? `PR #${context.task.prNumber} is open. Use get_pr_diff to review the changes and get_ci_results to check CI status.`
        : "No PR yet — validate the task description for potential issues.",
      "",
      "Steps:",
      "1. Check CI status for the PR (use get_ci_results with the PR number)",
      "2. If CI hasn't run, trigger it with trigger_ci_workflow on the PR branch",
      "3. Get the PR diff if available",
      "4. Check modified files for input sanitization",
      "5. Verify no cross-domain imports are introduced",
      "6. Assess impact on critical user flows",
      "7. Call submit_verdict with your assessment including CI status",
    ].join("\n");

    const output = await this.executeAgent(agent, input, context);

    let parsed: { verdict?: string; score?: number; ciStatus?: string; summary?: string };
    try {
      parsed = JSON.parse(output);
    } catch {
      parsed = { verdict: "SAFE", summary: output };
    }

    const isUnsafe = parsed.verdict === "UNSAFE";
    const needsTests = parsed.verdict === "NEEDS_TESTS";

    if (context.task.prNumber) {
      const label = isUnsafe ? "UNSAFE" : needsTests ? "NEEDS_TESTS" : "SAFE";
      await this.deps.github.addPRReviewComment(
        context.task.prNumber,
        `## QA Validation Report\n\n**Verdict**: ${label} (Score: ${parsed.score ?? "N/A"}/100)\n**CI Status**: ${parsed.ciStatus ?? "unknown"}\n\n${parsed.summary ?? output}`
      );

      this.deps.auditLogger.log({
        agentId: this.role,
        action: "qa_review_posted",
        details: { prNumber: context.task.prNumber, verdict: parsed.verdict, score: parsed.score, ciStatus: parsed.ciStatus },
        taskId: context.task.id,
        subtaskId: context.subtask.id,
        rationale: `Posted QA review on PR #${context.task.prNumber}: ${label} (CI: ${parsed.ciStatus ?? "unknown"})`,
      });
    }

    return {
      success: !isUnsafe,
      summary: isUnsafe
        ? `QA validation FAILED: ${parsed.summary ?? "unsafe changes detected"}`
        : needsTests
          ? `QA passed with warnings — tests needed: ${parsed.summary ?? ""}`
          : `QA validation passed: ${parsed.summary ?? "changes are safe"}`,
      prComments: context.task.prNumber ? [output] : undefined,
    };
  }
}
