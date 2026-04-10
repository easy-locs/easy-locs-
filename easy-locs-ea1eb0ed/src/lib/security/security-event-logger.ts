import { db } from "@/services/db";

export type SecurityEventType =
  | "otp_sent"
  | "otp_verified"
  | "otp_failed"
  | "login_success"
  | "login_failed"
  | "session_created"
  | "session_revoked"
  | "session_expired"
  | "device_new"
  | "device_changed"
  | "device_trusted"
  | "device_suspect"
  | "tx_blocked"
  | "tx_flagged"
  | "tx_allowed"
  | "tx_large"
  | "account_flagged"
  | "account_blocked"
  | "account_unflagged"
  | "kyc_started"
  | "kyc_completed"
  | "kyc_rejected"
  | "fraud_signal"
  | "fraud_review"
  | "limit_exceeded"
  | "rate_limited"
  | "trust_level_changed"
  | "security_flag_changed"
  | "pin_set"
  | "pin_changed"
  | "pin_reset"
  | "wallet_frozen"
  | "wallet_unfrozen"
  | "orbit_abuse"
  | "orbit_spam";

export type SecurityEventSeverity = "info" | "warning" | "alert" | "critical";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  userId: string;
  timestamp: number;
  details: Record<string, unknown>;
  action: string;
  ip?: string;
  deviceId?: string;
  country?: string;
  resolved: boolean;
}

const eventBuffer: SecurityEvent[] = [];
const MAX_BUFFER = 100;
const FLUSH_INTERVAL_MS = 30_000;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function generateEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSeverity(type: SecurityEventType): SecurityEventSeverity {
  const criticalTypes: SecurityEventType[] = [
    "account_blocked", "wallet_frozen", "fraud_signal",
  ];
  const alertTypes: SecurityEventType[] = [
    "tx_blocked", "account_flagged", "device_suspect", "orbit_abuse",
    "fraud_review", "security_flag_changed",
  ];
  const warningTypes: SecurityEventType[] = [
    "otp_failed", "login_failed", "tx_flagged", "device_new",
    "device_changed", "limit_exceeded", "rate_limited", "orbit_spam",
    "kyc_rejected",
  ];

  if (criticalTypes.includes(type)) return "critical";
  if (alertTypes.includes(type)) return "alert";
  if (warningTypes.includes(type)) return "warning";
  return "info";
}

export function logSecurityEvent(
  type: SecurityEventType,
  userId: string,
  details: Record<string, unknown> = {},
  action: string = "auto"
): SecurityEvent {
  const event: SecurityEvent = {
    id: generateEventId(),
    type,
    severity: getSeverity(type),
    userId,
    timestamp: Date.now(),
    details,
    action,
    deviceId: details.deviceId as string | undefined,
    country: details.country as string | undefined,
    resolved: false,
  };

  eventBuffer.push(event);

  if (event.severity === "critical" || event.severity === "alert") {
    console.warn(`[SECURITY] ${event.severity.toUpperCase()}: ${type} for user ${userId.slice(0, 8)}...`, details);
  }

  if (eventBuffer.length >= MAX_BUFFER) {
    flushEvents();
  }

  if (!flushTimer) {
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS);
  }

  return event;
}

async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const batch = eventBuffer.splice(0, eventBuffer.length);

  try {
    const rows = batch.map(evt => ({
      id: evt.id,
      event_type: evt.type,
      severity: evt.severity,
      user_id: evt.userId,
      created_at: new Date(evt.timestamp).toISOString(),
      details: evt.details,
      action_taken: evt.action,
      device_id: evt.deviceId || null,
      country: evt.country || null,
      resolved: evt.resolved,
    }));

    await db.from("security_events" as any).insert(rows as any);
  } catch (err) {
    console.warn("[SecurityEventLogger] flush failed, events re-queued:", err);
    eventBuffer.unshift(...batch);
  }
}

export function getRecentEvents(userId: string, limit = 50): SecurityEvent[] {
  return eventBuffer
    .filter(e => e.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getEventsByType(type: SecurityEventType, limit = 50): SecurityEvent[] {
  return eventBuffer
    .filter(e => e.type === type)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getCriticalEvents(limit = 20): SecurityEvent[] {
  return eventBuffer
    .filter(e => e.severity === "critical" || e.severity === "alert")
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export async function querySecurityEvents(filters: {
  userId?: string;
  type?: SecurityEventType;
  severity?: SecurityEventSeverity;
  since?: number;
  limit?: number;
}): Promise<SecurityEvent[]> {
  try {
    let query = db.from("security_events" as any).select("*");

    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.type) query = query.eq("event_type", filters.type);
    if (filters.severity) query = query.eq("severity", filters.severity);
    if (filters.since) query = query.gte("created_at", new Date(filters.since).toISOString());

    query = query.order("created_at", { ascending: false }).limit(filters.limit || 50);

    const { data } = await query;
    if (!data) return [];

    return (data as any[]).map(row => ({
      id: row.id,
      type: row.event_type,
      severity: row.severity,
      userId: row.user_id,
      timestamp: new Date(row.created_at).getTime(),
      details: row.details || {},
      action: row.action_taken,
      deviceId: row.device_id,
      country: row.country,
      resolved: row.resolved,
    }));
  } catch {
    return [];
  }
}

export function logTransactionBlocked(userId: string, reason: string, amount: number, action: string): void {
  logSecurityEvent("tx_blocked", userId, { reason, amount, action });
}

export function logFraudSignal(userId: string, signalType: string, score: number, details: string): void {
  logSecurityEvent("fraud_signal", userId, { signalType, score, details });
}

export function logTrustLevelChanged(userId: string, oldLevel: number, newLevel: number): void {
  logSecurityEvent("trust_level_changed", userId, { oldLevel, newLevel });
}

export function logSecurityFlagChanged(userId: string, oldFlag: string, newFlag: string, reason: string): void {
  logSecurityEvent("security_flag_changed", userId, { oldFlag, newFlag, reason });
}

export function logDeviceEvent(userId: string, type: "device_new" | "device_changed" | "device_trusted" | "device_suspect", deviceId: string): void {
  logSecurityEvent(type, userId, { deviceId });
}

export function logOtpEvent(userId: string, success: boolean, context: string): void {
  logSecurityEvent(success ? "otp_verified" : "otp_failed", userId, { context });
}
