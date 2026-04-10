import { engineOrchestrator } from "../core/engine-orchestrator";
import { engineObserver } from "../core/engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";

export type AgentRole = "debug" | "performance" | "ux" | "data" | "security" | "growth";

interface AgentInsight {
  timestamp: number;
  role: AgentRole;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  engineSource: string;
}

interface AgentStatus {
  role: AgentRole;
  label: string;
  engineCount: number;
  runningCount: number;
  totalFindings: number;
  totalActions: number;
  errorCount: number;
  healthScore: number;
  lastActivity: number;
}

const AGENT_CATEGORY_MAP: Record<AgentRole, string[]> = {
  debug: ["self-healing", "observability", "code-quality"],
  performance: ["performance", "release"],
  ux: ["uiux", "orbit", "calls"],
  data: ["data", "radar", "realtime", "architecture"],
  security: ["security", "wallet"],
  growth: ["business", "support", "ai"],
};

const AGENT_LABELS: Record<AgentRole, string> = {
  debug: "Debug Agent",
  performance: "Performance Agent",
  ux: "UX Agent",
  data: "Data Agent",
  security: "Security Agent",
  growth: "Growth Agent",
};

class AgentIntelligenceLayer {
  private insights: AgentInsight[] = [];
  private readonly MAX_INSIGHTS = 200;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    if (this._intervalId) return;
    this._intervalId = setInterval(() => this.analyze(), 60_000);
    this._timeoutId = setTimeout(() => {
      this._timeoutId = null;
      this.analyze();
    }, 5_000);
  }

  stop(): void {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  private analyze(): void {
    const report = engineObserver.getReport();

    for (const [role, categories] of Object.entries(AGENT_CATEGORY_MAP) as [AgentRole, string[]][]) {
      const agentEngines = report.engines.filter(e => categories.includes(e.category));

      const errorEngines = agentEngines.filter(e => e.errorCount > 3);
      for (const e of errorEngines) {
        this.addInsight({
          role,
          severity: e.errorCount > 10 ? "critical" : "warning",
          title: `${AGENT_LABELS[role]}: Engine ${e.engineId} has ${e.errorCount} errors`,
          detail: `Repeated failures in ${e.engineId} — may need investigation or restart.`,
          engineSource: e.engineId,
        });
      }

      const highFindingEngines = agentEngines.filter(e => e.totalFindings > 50);
      for (const e of highFindingEngines) {
        this.addInsight({
          role,
          severity: "info",
          title: `${AGENT_LABELS[role]}: ${e.engineId} detected ${e.totalFindings} issues`,
          detail: `High finding count suggests systemic pattern worth addressing.`,
          engineSource: e.engineId,
        });
      }
    }

    platformBus.emit("engine:ai:agent-analysis-complete" as any, {
      timestamp: Date.now(),
      agentCount: Object.keys(AGENT_CATEGORY_MAP).length,
      insightCount: this.insights.length,
    });
  }

  private addInsight(insight: Omit<AgentInsight, "timestamp">): void {
    const recent = this.insights.filter(
      i => i.engineSource === insight.engineSource && i.title === insight.title && Date.now() - i.timestamp < 300_000
    );
    if (recent.length > 0) return;

    this.insights.push({ ...insight, timestamp: Date.now() });
    if (this.insights.length > this.MAX_INSIGHTS) {
      this.insights = this.insights.slice(-this.MAX_INSIGHTS);
    }
  }

  getAgentStatus(role: AgentRole): AgentStatus {
    const categories = AGENT_CATEGORY_MAP[role];
    const report = engineObserver.getReport();
    const agentEngines = report.engines.filter(e => categories.includes(e.category));

    const totalFindings = agentEngines.reduce((s, e) => s + e.totalFindings, 0);
    const totalActions = agentEngines.reduce((s, e) => s + e.totalActions, 0);
    const errorCount = agentEngines.reduce((s, e) => s + e.errorCount, 0);
    const lastActivity = Math.max(0, ...agentEngines.map(e => e.lastTick));

    let healthScore = 100;
    if (errorCount > 0) healthScore -= Math.min(40, errorCount * 5);
    const runningCount = agentEngines.filter(e => {
      const engine = engineOrchestrator.getEngine(e.engineId);
      return engine?.isRunning ?? false;
    }).length;
    const engineCount = agentEngines.length;
    if (engineCount > 0 && runningCount < engineCount) {
      healthScore -= Math.min(30, (engineCount - runningCount) * 5);
    }
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      role,
      label: AGENT_LABELS[role],
      engineCount,
      runningCount,
      totalFindings,
      totalActions,
      errorCount,
      healthScore,
      lastActivity,
    };
  }

  getAllAgentStatuses(): AgentStatus[] {
    return (Object.keys(AGENT_ENGINE_MAP) as AgentRole[]).map(role => this.getAgentStatus(role));
  }

  getInsights(role?: AgentRole, limit = 50): AgentInsight[] {
    const filtered = role ? this.insights.filter(i => i.role === role) : this.insights;
    return filtered.slice(-limit);
  }

  getSystemHealthScore(): number {
    const statuses = this.getAllAgentStatuses();
    if (statuses.length === 0) return 100;
    return Math.round(statuses.reduce((s, a) => s + a.healthScore, 0) / statuses.length);
  }

  getReport() {
    return {
      timestamp: Date.now(),
      systemHealth: this.getSystemHealthScore(),
      agents: this.getAllAgentStatuses(),
      recentInsights: this.getInsights(undefined, 20),
      orchestratorReport: engineOrchestrator.getReport(),
    };
  }
}

export const agentIntelligence = new AgentIntelligenceLayer();
