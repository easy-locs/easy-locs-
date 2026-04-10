/**
 * Orbit Observability — Structured logging for critical messaging/call flows.
 * Logs key events with timing for performance monitoring.
 */

type LogLevel = "info" | "warn" | "error" | "metric";

interface OrbitLogEntry {
  event: string;
  level: LogLevel;
  timestamp: number;
  data?: Record<string, unknown>;
  durationMs?: number;
}

const LOG_BUFFER_MAX = 500;
const logBuffer: OrbitLogEntry[] = [];

function log(event: string, level: LogLevel, data?: Record<string, unknown>, durationMs?: number): void {
  const entry: OrbitLogEntry = {
    event,
    level,
    timestamp: Date.now(),
    data,
    durationMs,
  };

  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();

  if (level === "error") {
    console.error(`[orbit:${event}]`, data);
  } else if (import.meta.env.DEV) {
    console.debug(`[orbit:${event}]`, durationMs ? `${durationMs}ms` : "", data ?? "");
  }
}

// ── Message Events ──
export function logMessageSendStarted(conversationId: string, tempId: string): number {
  const start = performance.now();
  log("message.send.started", "info", { conversationId, tempId });
  return start;
}

export function logMessageSendAcked(conversationId: string, tempId: string, serverId: string, startTime: number): void {
  const duration = Math.round(performance.now() - startTime);
  log("message.send.acked", "info", { conversationId, tempId, serverId }, duration);
}

export function logMessageSendFailed(conversationId: string, tempId: string, error: string): void {
  log("message.send.failed", "error", { conversationId, tempId, error });
}

export function logMessageReconciled(tempId: string, serverId: string): void {
  log("message.reconciled", "info", { tempId, serverId });
}

// ── Realtime Events ──
export function logRealtimeEventReceived(table: string, eventType: string, id: string): void {
  log("realtime.event.received", "info", { table, eventType, id });
}

export function logRealtimeEventDeduped(id: string, reason: string): void {
  log("realtime.event.deduped", "info", { id, reason });
}

export function logRealtimeReconnect(channel: string): void {
  log("realtime.reconnect", "warn", { channel });
}

// ── Call Events ──
export function logCallRinging(sessionId: string, peerId: string): void {
  log("call.ringing", "info", { sessionId, peerId });
}

export function logCallAccepted(sessionId: string): void {
  log("call.accepted", "info", { sessionId });
}

export function logCallFailed(sessionId: string, reason: string): void {
  log("call.failed", "error", { sessionId, reason });
}

export function logCallEnded(sessionId: string, durationMs: number): void {
  log("call.ended", "info", { sessionId }, durationMs);
}

// ── Queue Events ──
export function logQueueJobStarted(jobId: string, kind: string): void {
  log("queue.job.started", "info", { jobId, kind });
}

export function logQueueJobFailed(jobId: string, kind: string, error: string): void {
  log("queue.job.failed", "error", { jobId, kind, error });
}

export function logQueueJobCompleted(jobId: string, kind: string): void {
  log("queue.job.completed", "info", { jobId, kind });
}

// ── Sync Events ──
export function logSyncStarted(reason: string): void {
  log("sync.started", "info", { reason });
}

export function logSyncCompleted(reason: string, durationMs: number, counts?: Record<string, number>): void {
  log("sync.completed", "info", { reason, ...counts }, durationMs);
}

// ── Performance Metrics ──
export function logInboxOpen(durationMs: number, conversationCount: number): void {
  log("perf.inbox.open", "metric", { conversationCount }, durationMs);
}

export function logConversationOpen(conversationId: string, durationMs: number, messageCount: number): void {
  log("perf.conversation.open", "metric", { conversationId, messageCount }, durationMs);
}

// ── Buffer Access (for debugging/support) ──
export function getLogBuffer(): OrbitLogEntry[] {
  return [...logBuffer];
}

export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

export function getLogStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const entry of logBuffer) {
    stats[entry.event] = (stats[entry.event] || 0) + 1;
  }
  return stats;
}
