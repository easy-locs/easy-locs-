import type { SentinelStatus, EngineCriticality, SentinelSeverity } from "./types";

export interface SentinelEngineContract {
  getEngineId(): string;
  getEngineName(): string;
  getDomain(): string;
  getCriticality(): EngineCriticality;
  getStatus(): SentinelStatus;
  getHeartbeat(): EngineHeartbeat;
  runAudit(): Promise<EngineAuditResult>;
  getMetrics(): EngineMetrics;
  getDependencies(): string[];
  getOpenIncidents(): EngineIncident[];
  getLastSuccessfulRun(): number;
}

export interface EngineHeartbeat {
  engine_id: string;
  alive: boolean;
  timestamp: number;
  latency_ms: number;
  error_rate: number;
  uptime_ms: number;
}

export interface EngineAuditResult {
  engine_id: string;
  passed: boolean;
  score: number;
  blocking_issues: number;
  warnings: number;
  findings: AuditFinding[];
  auto_fixes_applied: number;
  timestamp: number;
}

export interface AuditFinding {
  id: string;
  severity: SentinelSeverity;
  category: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  auto_fixable: boolean;
  blocking: boolean;
}

export interface EngineMetrics {
  engine_id: string;
  tick_count: number;
  error_count: number;
  avg_latency_ms: number;
  queue_depth: number;
  last_tick: number;
}

export interface EngineIncident {
  id: string;
  severity: SentinelSeverity;
  title: string;
  started_at: number;
  status: "open" | "investigating" | "mitigated";
}

export function validateEngineContract(engine: unknown): engine is SentinelEngineContract {
  if (!engine || typeof engine !== "object") return false;
  const e = engine as Record<string, unknown>;
  return (
    typeof e.getEngineId === "function" &&
    typeof e.getEngineName === "function" &&
    typeof e.getDomain === "function" &&
    typeof e.getCriticality === "function" &&
    typeof e.getStatus === "function" &&
    typeof e.getHeartbeat === "function" &&
    typeof e.runAudit === "function" &&
    typeof e.getMetrics === "function" &&
    typeof e.getDependencies === "function" &&
    typeof e.getOpenIncidents === "function" &&
    typeof e.getLastSuccessfulRun === "function"
  );
}

export interface SentinelPipelineStage {
  name: string;
  order: number;
  execute(ctx: PipelineStageContext): Promise<PipelineStageResult>;
}

export interface PipelineStageContext {
  request_id: string;
  entity_type: string;
  entity_id: string;
  domain: string;
  payload: Record<string, unknown>;
  previous_stages: string[];
  metadata: Record<string, unknown>;
}

export interface PipelineStageResult {
  stage: string;
  passed: boolean;
  blocking: boolean;
  message: string;
  mutations: Record<string, unknown>;
  events: string[];
}

export interface SentinelScannerContract {
  scanner_id: string;
  scan(): Promise<ScanResult>;
}

export interface ScanResult {
  scanner_id: string;
  findings: AuditFinding[];
  score: number;
  timestamp: number;
}
