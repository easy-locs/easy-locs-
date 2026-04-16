import { platformBus, generateCorrelationId } from "@/lib/shared/platform-bus";

export interface AgentMessageBase {
  correlationId: string;
  timestamp: number;
  source: string;
  target: string;
}

export interface SentinelToOmega extends AgentMessageBase {
  type: "sentinel:issue_detected";
  issueId: string;
  severity: "critical" | "high" | "medium" | "low";
  affectedDomain: string;
  description: string;
  affectedEntities: string[];
  metadata?: Record<string, unknown>;
}

export interface OmegaToRepairEngine extends AgentMessageBase {
  type: "omega:repair_requested";
  issueId: string;
  proposedFix: string;
  strategy: "auto_heal" | "rollback" | "quarantine" | "escalate";
  constraints: {
    maxDurationMs: number;
    allowSideEffects: boolean;
    requiresApproval: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface RepairToOmega extends AgentMessageBase {
  type: "repair:outcome_reported";
  issueId: string;
  outcome: "success" | "partial" | "failed" | "skipped";
  durationMs: number;
  sideEffects: string[];
  attemptNumber: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface OmegaToQuarantine extends AgentMessageBase {
  type: "omega:quarantine_requested";
  entityId: string;
  entityType: string;
  reason: string;
  durationMs: number;
  severity: "critical" | "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
}

export type AgentMessage = SentinelToOmega | OmegaToRepairEngine | RepairToOmega | OmegaToQuarantine;

const agentMessageLog: AgentMessage[] = [];
const MAX_AGENT_LOG = 500;
const repairAttemptCounts = new Map<string, number>();
const MAX_REPAIR_ATTEMPTS = 3;

export function getAgentMessageLog(): readonly AgentMessage[] {
  return agentMessageLog;
}

export function getRepairAttemptCount(issueId: string): number {
  return repairAttemptCounts.get(issueId) ?? 0;
}

function logAgentMessage(msg: AgentMessage): void {
  agentMessageLog.push(msg);
  if (agentMessageLog.length > MAX_AGENT_LOG) {
    agentMessageLog.splice(0, agentMessageLog.length - MAX_AGENT_LOG);
  }
}

export function sendSentinelToOmega(params: Omit<SentinelToOmega, "correlationId" | "timestamp" | "source" | "target" | "type">): string {
  const correlationId = generateCorrelationId("s2o");
  const msg: SentinelToOmega = {
    ...params,
    type: "sentinel:issue_detected",
    correlationId,
    timestamp: Date.now(),
    source: "sentinel",
    target: "omega",
  };
  logAgentMessage(msg);
  platformBus.emit("agent:sentinel_to_omega", msg, "system", { correlationId });
  return correlationId;
}

export function sendOmegaToRepairEngine(params: Omit<OmegaToRepairEngine, "correlationId" | "timestamp" | "source" | "target" | "type"> & { correlationId?: string }): string {
  const correlationId = params.correlationId ?? generateCorrelationId("o2r");
  const msg: OmegaToRepairEngine = {
    ...params,
    type: "omega:repair_requested",
    correlationId,
    timestamp: Date.now(),
    source: "omega",
    target: "repair-engine",
  };
  logAgentMessage(msg);
  platformBus.emit("agent:omega_to_repair", msg, "system", { correlationId });
  return correlationId;
}

export function sendRepairToOmega(params: Omit<RepairToOmega, "correlationId" | "timestamp" | "source" | "target" | "type"> & { correlationId: string }): void {
  const msg: RepairToOmega = {
    ...params,
    type: "repair:outcome_reported",
    timestamp: Date.now(),
    source: "repair-engine",
    target: "omega",
  };
  logAgentMessage(msg);

  platformBus.emit("agent:repair_to_omega", msg, "system", { correlationId: params.correlationId });

  if (params.outcome === "failed") {
    const count = (repairAttemptCounts.get(params.issueId) ?? 0) + 1;
    repairAttemptCounts.set(params.issueId, count);
    if (count >= MAX_REPAIR_ATTEMPTS) {
      sendOmegaToQuarantine({
        entityId: params.issueId,
        entityType: "issue",
        reason: `Repair failed ${count} times — auto-quarantine triggered`,
        durationMs: 3600_000,
        severity: "high",
        correlationId: params.correlationId,
      });
    }
  }
}

export function sendOmegaToQuarantine(params: Omit<OmegaToQuarantine, "correlationId" | "timestamp" | "source" | "target" | "type"> & { correlationId?: string }): string {
  const correlationId = params.correlationId ?? generateCorrelationId("o2q");
  const msg: OmegaToQuarantine = {
    ...params,
    type: "omega:quarantine_requested",
    correlationId,
    timestamp: Date.now(),
    source: "omega",
    target: "quarantine",
  };
  logAgentMessage(msg);
  platformBus.emit("agent:omega_to_quarantine", msg, "system", { correlationId });
  return correlationId;
}

export function installAgentProtocolListeners(): () => void {
  const unsubs: (() => void)[] = [];

  unsubs.push(
    platformBus.on("agent:sentinel_to_omega", (event) => {
      const msg = event.payload as SentinelToOmega;
      if (import.meta.env?.DEV) {
        console.debug(`[agent-protocol] Sentinel→Omega: ${msg.issueId} (${msg.severity})`, msg.description);
      }
    })
  );

  unsubs.push(
    platformBus.on("agent:repair_to_omega", (event) => {
      const msg = event.payload as RepairToOmega;
      if (import.meta.env?.DEV) {
        console.debug(`[agent-protocol] Repair→Omega: ${msg.issueId} outcome=${msg.outcome} attempt=${msg.attemptNumber}`);
      }
    })
  );

  unsubs.push(
    platformBus.on("agent:omega_to_quarantine", (event) => {
      const msg = event.payload as OmegaToQuarantine;
      if (import.meta.env?.DEV) {
        console.debug(`[agent-protocol] Omega→Quarantine: ${msg.entityId} reason=${msg.reason}`);
      }
    })
  );

  return () => unsubs.forEach((fn) => fn());
}
