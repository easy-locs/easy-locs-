import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

type ControlPlaneAction =
  | "persist_checkpoint"
  | "record_anomaly_window"
  | "upsert_dashboard_card"
  | "record_db_observability"
  | "toggle_kill_switch"
  | "set_domain_degradation"
  | "check_queue_dedup"
  | "batch_persist";

interface ControlPlaneRequest {
  action: ControlPlaneAction;
  payload: Record<string, unknown>;
}

interface ControlPlaneResponse {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

const pendingBatch: ControlPlaneRequest[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_FLUSH_MS = 2000;
const MAX_BATCH_SIZE = 20;

async function invokeControlPlane(
  request: ControlPlaneRequest,
): Promise<ControlPlaneResponse> {
  const { data, error } = await db.functions.invoke("runtime-control-plane", {
    body: request,
  });

  if (error) {
    platformBus.emit("runtime:rpc_error", {
      action: request.action,
      error: error.message ?? String(error),
    }, "system");
    return { ok: false, error: error.message ?? String(error) };
  }

  return (data as ControlPlaneResponse) ?? { ok: true };
}

function scheduleBatchFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushBatch();
  }, BATCH_FLUSH_MS);
}

async function flushBatch(): Promise<void> {
  flushTimer = null;
  if (pendingBatch.length === 0) return;

  const items = pendingBatch.splice(0, MAX_BATCH_SIZE);
  try {
    await invokeControlPlane({
      action: "batch_persist",
      payload: { items },
    });
  } catch (err: unknown) {
    platformBus.emit("runtime:batch_persist_error", {
      count: items.length,
      error: err instanceof Error ? err.message : String(err),
    }, "system");
  }

  if (pendingBatch.length > 0) {
    scheduleBatchFlush();
  }
}

export function enqueueCheckpointPersist(checkpoint: {
  flowId: string;
  machineName: string;
  currentState: string;
  previousState: string;
  event: string;
  transitionId: string;
  guardResults: Record<string, { allowed: boolean; reason?: string }>;
}): void {
  pendingBatch.push({
    action: "persist_checkpoint",
    payload: checkpoint,
  });
  scheduleBatchFlush();
}

export function enqueueAnomalyWindowPersist(window: {
  domain: string;
  windowStart: string;
  windowEnd: string;
  errorCount?: number;
  successCount?: number;
  errorVelocity?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  retryStormCount?: number;
  queueBacklogDepth?: number;
  mutationRejectionRate?: number;
  reconnectFrequency?: number;
  invalidTransitionCount?: number;
  staleDataFrequency?: number;
  anomalyDetected?: boolean;
  actionsTaken?: string[];
}): void {
  pendingBatch.push({
    action: "record_anomaly_window",
    payload: window,
  });
  scheduleBatchFlush();
}

export function enqueueDashboardCardUpsert(card: {
  cardId: string;
  cardType: string;
  domain: string;
  title: string;
  value: Record<string, unknown>;
  status?: string;
  freshnessTtl?: number;
  ownerQuery?: string;
}): void {
  pendingBatch.push({
    action: "upsert_dashboard_card",
    payload: card,
  });
  scheduleBatchFlush();
}

export function enqueueDbObservabilityMetric(metric: {
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  thresholdWarn?: number;
  thresholdCrit?: number;
  metadata?: Record<string, unknown>;
}): void {
  pendingBatch.push({
    action: "record_db_observability",
    payload: metric,
  });
  scheduleBatchFlush();
}

export async function toggleKillSwitchServer(
  feature: string,
  enabled: boolean,
  actor: string,
  reason?: string,
): Promise<ControlPlaneResponse> {
  return invokeControlPlane({
    action: "toggle_kill_switch",
    payload: { feature, enabled, actor, reason },
  });
}

export async function setDomainDegradationServer(
  domain: string,
  mode: string,
  actor: string,
  reason?: string,
  autoRestoreMinutes?: number,
): Promise<ControlPlaneResponse> {
  return invokeControlPlane({
    action: "set_domain_degradation",
    payload: { domain, mode, actor, reason, autoRestoreMinutes },
  });
}

export async function checkQueueDedupServer(
  fingerprint: string,
  queueName: string,
  jobId: string,
  windowSeconds?: number,
): Promise<boolean> {
  const result = await invokeControlPlane({
    action: "check_queue_dedup",
    payload: { fingerprint, queueName, jobId, windowSeconds },
  });
  return result.isDuplicate === true;
}
