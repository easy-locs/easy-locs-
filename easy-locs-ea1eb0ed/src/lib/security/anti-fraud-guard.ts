import { type SecurityFlag } from "@/lib/trust/trust-levels";

const IDEMPOTENCY_TTL_MS = 300_000;
const MAX_TX_PER_MINUTE = 10;
const MAX_ORDER_PER_MINUTE = 3;
const VELOCITY_WINDOW_MS = 3_600_000;
const MAX_UNIQUE_RECIPIENTS_PER_HOUR = 15;
const SUSPICIOUS_AMOUNT_THRESHOLD = 25_000;
const RAPID_SUCCESSION_MS = 5_000;
const MAX_RAPID_TX = 3;

const TRUST_ADJUSTED_LIMITS: Record<SecurityFlag, { maxTxPerMin: number; maxRecipients: number; suspiciousThreshold: number }> = {
  blocked: { maxTxPerMin: 0, maxRecipients: 0, suspiciousThreshold: 0 },
  restricted: { maxTxPerMin: 0, maxRecipients: 0, suspiciousThreshold: 0 },
  high_risk: { maxTxPerMin: 2, maxRecipients: 2, suspiciousThreshold: 500 },
  review_required: { maxTxPerMin: 3, maxRecipients: 3, suspiciousThreshold: 1000 },
  suspicious: { maxTxPerMin: 5, maxRecipients: 8, suspiciousThreshold: 5000 },
  low_risk: { maxTxPerMin: 8, maxRecipients: 12, suspiciousThreshold: 15000 },
  normal: { maxTxPerMin: MAX_TX_PER_MINUTE, maxRecipients: MAX_UNIQUE_RECIPIENTS_PER_HOUR, suspiciousThreshold: SUSPICIOUS_AMOUNT_THRESHOLD },
};

interface IdempotencyEntry {
  key: string;
  timestamp: number;
  result?: unknown;
}

interface RateLimitBucket {
  timestamps: number[];
}

interface TimedAmount {
  amount: number;
  timestamp: number;
}

interface VelocityRecord {
  recipients: Map<string, number>;
  amounts: TimedAmount[];
  timestamps: number[];
}

const idempotencyCache = new Map<string, IdempotencyEntry>();
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const velocityTracking = new Map<string, VelocityRecord>();
const blockedUsers = new Map<string, number>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache) {
    if (now - entry.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
  for (const [key, ts] of blockedUsers) {
    if (now - ts > VELOCITY_WINDOW_MS) {
      blockedUsers.delete(key);
    }
  }
  for (const [key, record] of velocityTracking) {
    record.timestamps = record.timestamps.filter(t => now - t < VELOCITY_WINDOW_MS);
    if (record.timestamps.length === 0) velocityTracking.delete(key);
  }
}

setInterval(pruneExpired, 60_000);

export function generateIdempotencyKey(userId: string, action: string, payload: Record<string, unknown>): string {
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  const raw = `${userId}:${action}:${sorted}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `idem_${Math.abs(hash).toString(36)}`;
}

export function isDuplicate(idempotencyKey: string): { duplicate: boolean; cachedResult?: unknown } {
  const entry = idempotencyCache.get(idempotencyKey);
  if (!entry) return { duplicate: false };
  if (Date.now() - entry.timestamp > IDEMPOTENCY_TTL_MS) {
    idempotencyCache.delete(idempotencyKey);
    return { duplicate: false };
  }
  return { duplicate: true, cachedResult: entry.result };
}

export function recordOperation(idempotencyKey: string, result?: unknown): void {
  idempotencyCache.set(idempotencyKey, {
    key: idempotencyKey,
    timestamp: Date.now(),
    result,
  });
}

export function checkRateLimit(userId: string, action: string, overrideLimit?: number): { allowed: boolean; retryAfterMs?: number } {
  const bucketKey = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = 60_000;
  const limit = overrideLimit ?? (action === "order" ? MAX_ORDER_PER_MINUTE : MAX_TX_PER_MINUTE);

  let bucket = rateLimitBuckets.get(bucketKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitBuckets.set(bucketKey, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    return { allowed: false, retryAfterMs: windowMs - (now - oldest) };
  }

  bucket.timestamps.push(now);
  return { allowed: true };
}

function checkVelocity(userId: string, recipientId: string, amount: number, overrideMaxRecipients?: number, overrideSuspiciousThreshold?: number): { pass: boolean; reason?: string } {
  const now = Date.now();
  const maxRecipients = overrideMaxRecipients ?? MAX_UNIQUE_RECIPIENTS_PER_HOUR;
  const suspiciousThreshold = overrideSuspiciousThreshold ?? SUSPICIOUS_AMOUNT_THRESHOLD;

  if (blockedUsers.has(userId)) {
    return { pass: false, reason: "temporarily_blocked" };
  }

  let record = velocityTracking.get(userId);
  if (!record) {
    record = { recipients: new Map(), amounts: [], timestamps: [] };
    velocityTracking.set(userId, record);
  }

  record.timestamps = record.timestamps.filter(t => now - t < VELOCITY_WINDOW_MS);
  record.amounts = record.amounts.filter(a => now - a.timestamp < VELOCITY_WINDOW_MS);

  const recentRecipients = new Set<string>();
  for (const [rid, ts] of record.recipients) {
    if (now - ts < VELOCITY_WINDOW_MS) recentRecipients.add(rid);
    else record.recipients.delete(rid);
  }
  recentRecipients.add(recipientId);

  if (recentRecipients.size > maxRecipients) {
    blockedUsers.set(userId, now);
    return { pass: false, reason: "too_many_unique_recipients" };
  }

  const rapidTx = record.timestamps.filter(t => now - t < RAPID_SUCCESSION_MS);
  if (rapidTx.length >= MAX_RAPID_TX) {
    return { pass: false, reason: "rapid_succession" };
  }

  const hourlyTotal = record.amounts.reduce((s, a) => s + a.amount, 0) + amount;
  if (hourlyTotal > suspiciousThreshold) {
    return { pass: false, reason: "hourly_volume_exceeded" };
  }

  record.recipients.set(recipientId, now);
  record.amounts.push({ amount, timestamp: now });
  record.timestamps.push(now);

  return { pass: true };
}

export interface FraudCheckResult {
  pass: boolean;
  reason?: string;
  idempotencyKey: string;
  riskScore?: number;
}

function computeRiskScore(action: string, amount: number, userId: string): number {
  let score = 0;

  if (amount > 5000) score += 20;
  if (amount > 10000) score += 30;
  if (amount > 25000) score += 50;

  const record = velocityTracking.get(userId);
  if (record) {
    const now = Date.now();
    const recentTx = record.timestamps.filter(t => now - t < 300_000).length;
    if (recentTx > 5) score += 15;
    if (recentTx > 8) score += 25;

    const uniqueRecipients = new Set<string>();
    for (const [rid, ts] of record.recipients) {
      if (now - ts < VELOCITY_WINDOW_MS) uniqueRecipients.add(rid);
    }
    if (uniqueRecipients.size > 10) score += 20;
  }

  if (action === "wallet_topup" && amount > 20000) score += 15;

  return Math.min(score, 100);
}

export function preTransactionCheckWithTrust(
  userId: string,
  action: "wallet_topup" | "wallet_transfer" | "payment" | "order" | "ride_request",
  payload: Record<string, unknown>,
  securityFlag: SecurityFlag = "normal"
): FraudCheckResult {
  const adjustedLimits = TRUST_ADJUSTED_LIMITS[securityFlag] || TRUST_ADJUSTED_LIMITS.normal;

  if (securityFlag === "blocked" || securityFlag === "restricted") {
    return { pass: false, reason: "account_blocked", idempotencyKey: "", riskScore: 100 };
  }

  const idemKey = generateIdempotencyKey(userId, action, payload);

  const dupCheck = isDuplicate(idemKey);
  if (dupCheck.duplicate) {
    return { pass: false, reason: "duplicate_request", idempotencyKey: idemKey, riskScore: 100 };
  }

  const rateCheck = checkRateLimit(userId, action, adjustedLimits.maxTxPerMin);
  if (!rateCheck.allowed) {
    return { pass: false, reason: "rate_limited", idempotencyKey: idemKey, riskScore: 80 };
  }

  const amount = Number(payload.amount ?? 0);

  if (amount > adjustedLimits.suspiciousThreshold) {
    return { pass: false, reason: "amount_exceeds_trust_limit", idempotencyKey: idemKey, riskScore: 90 };
  }

  const recipientId = String(payload.recipientId ?? "");
  if (recipientId && (action === "wallet_transfer" || action === "payment")) {
    const velocityCheck = checkVelocity(userId, recipientId, amount, adjustedLimits.maxRecipients, adjustedLimits.suspiciousThreshold);
    if (!velocityCheck.pass) {
      return { pass: false, reason: velocityCheck.reason, idempotencyKey: idemKey, riskScore: 75 };
    }
  }

  let riskScore = computeRiskScore(action, amount, userId);
  if (securityFlag === "low_risk") riskScore = Math.min(100, riskScore + 10);
  if (securityFlag === "suspicious") riskScore = Math.min(100, riskScore + 20);
  if (securityFlag === "review_required") riskScore = Math.min(100, riskScore + 30);
  if (securityFlag === "high_risk") riskScore = Math.min(100, riskScore + 40);

  return { pass: true, idempotencyKey: idemKey, riskScore };
}

export function preTransactionCheck(
  userId: string,
  action: "wallet_topup" | "wallet_transfer" | "payment" | "order" | "ride_request",
  payload: Record<string, unknown>
): FraudCheckResult {
  const idemKey = generateIdempotencyKey(userId, action, payload);

  const dupCheck = isDuplicate(idemKey);
  if (dupCheck.duplicate) {
    return { pass: false, reason: "duplicate_request", idempotencyKey: idemKey, riskScore: 100 };
  }

  const rateCheck = checkRateLimit(userId, action);
  if (!rateCheck.allowed) {
    return { pass: false, reason: "rate_limited", idempotencyKey: idemKey, riskScore: 80 };
  }

  const amount = Number(payload.amount ?? 0);
  if (action === "wallet_topup" && amount > 50000) {
    return { pass: false, reason: "amount_exceeds_limit", idempotencyKey: idemKey, riskScore: 90 };
  }
  if (action === "wallet_transfer" && amount > 10000) {
    return { pass: false, reason: "transfer_exceeds_limit", idempotencyKey: idemKey, riskScore: 85 };
  }

  const recipientId = String(payload.recipientId ?? "");
  if (recipientId && (action === "wallet_transfer" || action === "payment")) {
    const velocityCheck = checkVelocity(userId, recipientId, amount);
    if (!velocityCheck.pass) {
      return { pass: false, reason: velocityCheck.reason, idempotencyKey: idemKey, riskScore: 75 };
    }
  }

  const riskScore = computeRiskScore(action, amount, userId);

  return { pass: true, idempotencyKey: idemKey, riskScore };
}

export function postTransactionRecord(idempotencyKey: string, result: unknown): void {
  recordOperation(idempotencyKey, result);
}

export function isUserBlocked(userId: string): boolean {
  return blockedUsers.has(userId);
}

export function unblockUser(userId: string): void {
  blockedUsers.delete(userId);
}
