import type { AgentRole, AuditLogEntry, TokenUsage } from "./types.js";

const MAX_LOG_ENTRIES = 5000;

export class AuditLogger {
  private entries: AuditLogEntry[] = [];
  private counter = 0;

  log(params: {
    agentId: AgentRole;
    action: string;
    details: Record<string, unknown>;
    taskId?: string;
    subtaskId?: string;
    rationale: string;
    durationMs?: number;
    tokenUsage?: TokenUsage;
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${++this.counter}`,
      timestamp: new Date().toISOString(),
      ...params,
    };

    this.entries.push(entry);

    if (this.entries.length > MAX_LOG_ENTRIES) {
      this.entries = this.entries.slice(-MAX_LOG_ENTRIES);
    }

    const level = entry.action.includes("error") || entry.action.includes("fail")
      ? "error"
      : "info";

    const msg = `[audit][${entry.agentId}] ${entry.action}: ${entry.rationale}`;
    if (level === "error") {
      console.error(msg, entry.details);
    } else {
      console.log(msg);
    }

    return entry;
  }

  getEntries(filter?: {
    agentId?: AgentRole;
    taskId?: string;
    since?: string;
    limit?: number;
  }): AuditLogEntry[] {
    let results = this.entries;

    if (filter?.agentId) {
      results = results.filter((e) => e.agentId === filter.agentId);
    }
    if (filter?.taskId) {
      results = results.filter((e) => e.taskId === filter.taskId);
    }
    if (filter?.since) {
      results = results.filter((e) => e.timestamp >= filter.since!);
    }

    const limit = filter?.limit ?? 100;
    return results.slice(-limit);
  }

  getRecentForAgent(agentId: AgentRole, limit = 10): AuditLogEntry[] {
    return this.getEntries({ agentId, limit });
  }

  getTokenUsageSummary(): {
    totalTokens: number;
    totalCostUsd: number;
    byAgent: Record<string, { tokens: number; costUsd: number }>;
  } {
    let totalTokens = 0;
    let totalCostUsd = 0;
    const byAgent: Record<string, { tokens: number; costUsd: number }> = {};

    for (const entry of this.entries) {
      if (!entry.tokenUsage) continue;
      totalTokens += entry.tokenUsage.totalTokens;
      totalCostUsd += entry.tokenUsage.estimatedCostUsd;

      if (!byAgent[entry.agentId]) {
        byAgent[entry.agentId] = { tokens: 0, costUsd: 0 };
      }
      byAgent[entry.agentId].tokens += entry.tokenUsage.totalTokens;
      byAgent[entry.agentId].costUsd += entry.tokenUsage.estimatedCostUsd;
    }

    return { totalTokens, totalCostUsd, byAgent };
  }

  clear(): void {
    this.entries = [];
  }
}
