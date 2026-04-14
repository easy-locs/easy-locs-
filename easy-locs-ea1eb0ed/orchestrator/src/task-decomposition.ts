import OpenAI from "openai";
import type {
  AgentRole,
  Task,
  Subtask,
  TokenUsage,
} from "./types.js";
import type { AuditLogger } from "./audit-logger.js";
import type { CostControls } from "./cost-controls.js";

const DECOMPOSITION_PROMPT = `You are the Task Decomposition Engine for the Easy-Locs multi-agent orchestrator.

Given a GitHub Issue, decompose it into an ordered list of subtasks and assign each to the appropriate agent.

# Available Agents
- chief-architect: Architecture review, structural validation, SSOT enforcement
- coding: Code implementation, branch creation, PR generation
- qa-validation: Test validation, security review, critical flow verification
- supabase: Database schema, migrations, RLS policies, Edge Functions
- deploy: Deployment readiness, preview checks, production promotion
- observability: Health monitoring, incident detection, engine metrics

# Decomposition Rules
1. Every task MUST include a chief-architect review subtask FIRST
2. Every coding task MUST be followed by qa-validation
3. Schema changes MUST include supabase validation
4. PRs ready for merge MUST include deploy assessment
5. Each subtask should be atomic and completable by a single agent
6. Return subtasks in execution order — each depends on the previous one

# Output Format (JSON)
{
  "subtasks": [
    {
      "title": "...",
      "description": "...",
      "assignedAgent": "chief-architect|coding|qa-validation|supabase|deploy|observability",
      "dependsOnPrevious": true|false
    }
  ]
}

Subtasks are executed sequentially: each subtask with dependsOnPrevious=true waits for the prior subtask to complete. The first subtask always has dependsOnPrevious=false.`;

export class TaskDecomposer {
  private openai: OpenAI;
  private model: string;
  private auditLogger: AuditLogger;
  private costControls: CostControls;
  private counter = 0;

  constructor(params: {
    openai: OpenAI;
    model: string;
    auditLogger: AuditLogger;
    costControls: CostControls;
  }) {
    this.openai = params.openai;
    this.model = params.model;
    this.auditLogger = params.auditLogger;
    this.costControls = params.costControls;
  }

  async decompose(task: Task): Promise<Subtask[]> {
    const budgetCheck = this.costControls.checkBudget();
    if (!budgetCheck.allowed) {
      throw new Error(`Budget exceeded: ${budgetCheck.reason}`);
    }

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: DECOMPOSITION_PROMPT },
        {
          role: "user",
          content: `# GitHub Issue #${task.githubIssueNumber}

## Title
${task.title}

## Body
${task.body}

## Labels
${task.labels.join(", ") || "none"}

Decompose this into ordered subtasks and assign to agents. Return JSON.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const usage = response.usage;
    const tokenUsage: TokenUsage = this.costControls.buildTokenUsage(
      this.model,
      usage?.prompt_tokens ?? 0,
      usage?.completion_tokens ?? 0
    );
    this.costControls.recordUsage(tokenUsage);

    const content = response.choices[0]?.message?.content ?? "{}";

    let parsed: { subtasks?: Array<{
      title: string;
      description: string;
      assignedAgent: AgentRole;
      dependsOnPrevious?: boolean;
    }> };

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse decomposition response: ${content.slice(0, 200)}`);
    }

    if (!parsed.subtasks?.length) {
      throw new Error("Decomposition returned no subtasks");
    }

    const normalized = this.normalizeOrdering(parsed.subtasks);

    const now = new Date().toISOString();
    const subtaskIds: string[] = [];
    const subtasks: Subtask[] = normalized.map((s, i) => {
      const id = `st-${task.id}-${++this.counter}`;
      subtaskIds.push(id);

      const dependencies: string[] = [];
      if (i > 0 && s.dependsOnPrevious !== false) {
        dependencies.push(subtaskIds[i - 1]);
      }

      return {
        id,
        parentTaskId: task.id,
        title: s.title,
        description: s.description,
        assignedAgent: s.assignedAgent,
        status: "pending" as const,
        dependencies,
        createdAt: now,
      };
    });

    this.auditLogger.log({
      agentId: "chief-architect",
      action: "task_decomposed",
      details: {
        issueNumber: task.githubIssueNumber,
        subtaskCount: subtasks.length,
        agents: [...new Set(subtasks.map((s) => s.assignedAgent))],
      },
      taskId: task.id,
      rationale: `Decomposed issue #${task.githubIssueNumber} into ${subtasks.length} subtasks`,
      tokenUsage,
    });

    return subtasks;
  }

  private normalizeOrdering(
    subtasks: Array<{
      title: string;
      description: string;
      assignedAgent: AgentRole;
      dependsOnPrevious?: boolean;
    }>
  ): Array<{
    title: string;
    description: string;
    assignedAgent: AgentRole;
    dependsOnPrevious?: boolean;
  }> {
    const result = [...subtasks];

    const architectIdx = result.findIndex((s) => s.assignedAgent === "chief-architect");
    if (architectIdx > 0) {
      const [arch] = result.splice(architectIdx, 1);
      arch.dependsOnPrevious = false;
      result.unshift(arch);
      if (result[1]) result[1].dependsOnPrevious = true;
    } else if (architectIdx === -1) {
      result.unshift({
        title: "Architecture review",
        description: "Review the proposed changes for architecture compliance and ORBIT conventions.",
        assignedAgent: "chief-architect",
        dependsOnPrevious: false,
      });
      if (result[1]) result[1].dependsOnPrevious = true;
    }

    for (let i = 0; i < result.length; i++) {
      if (result[i].assignedAgent === "coding") {
        const nextIdx = i + 1;
        if (nextIdx >= result.length || result[nextIdx].assignedAgent !== "qa-validation") {
          const qaExists = result.findIndex((s, j) => j > i && s.assignedAgent === "qa-validation");
          if (qaExists > nextIdx) {
            const [qa] = result.splice(qaExists, 1);
            qa.dependsOnPrevious = true;
            result.splice(nextIdx, 0, qa);
          } else if (qaExists === -1) {
            result.splice(nextIdx, 0, {
              title: "QA validation of code changes",
              description: "Validate the code changes for quality, security, and architecture compliance.",
              assignedAgent: "qa-validation",
              dependsOnPrevious: true,
            });
          }
        }
      }
    }

    return result;
  }
}
