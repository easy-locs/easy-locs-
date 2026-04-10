import { db } from "@/services/db";
import { type SecurityFlag } from "@/lib/trust/trust-levels";
import { type FraudCheckResult } from "./anti-fraud-guard";

export interface TransactionRiskEntry {
  transactionId: string;
  userId: string;
  recipientId: string | null;
  action: string;
  amount: number;
  currency: string;
  riskScore: number;
  securityFlag: SecurityFlag;
  fraudCheckResult: "passed" | "blocked" | "flagged";
  reason: string | null;
  idempotencyKey: string;
  deviceId: string | null;
  country: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

const riskLog: TransactionRiskEntry[] = [];
const MAX_LOCAL_LOG = 200;

export function recordTransactionRisk(params: {
  transactionId: string;
  userId: string;
  recipientId?: string;
  action: string;
  amount: number;
  currency?: string;
  fraudResult: FraudCheckResult;
  securityFlag: SecurityFlag;
  deviceId?: string;
  country?: string;
}): TransactionRiskEntry {
  const entry: TransactionRiskEntry = {
    transactionId: params.transactionId,
    userId: params.userId,
    recipientId: params.recipientId || null,
    action: params.action,
    amount: params.amount,
    currency: params.currency || "USD",
    riskScore: params.fraudResult.riskScore ?? 0,
    securityFlag: params.securityFlag,
    fraudCheckResult: params.fraudResult.pass ? "passed" : "blocked",
    reason: params.fraudResult.reason || null,
    idempotencyKey: params.fraudResult.idempotencyKey,
    deviceId: params.deviceId || null,
    country: params.country || null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date().toISOString(),
  };

  riskLog.push(entry);
  if (riskLog.length > MAX_LOCAL_LOG) riskLog.shift();

  persistRiskEntry(entry);

  return entry;
}

async function persistRiskEntry(entry: TransactionRiskEntry): Promise<void> {
  try {
    await db.from("transaction_risk_log" as any).insert({
      transaction_id: entry.transactionId,
      user_id: entry.userId,
      recipient_id: entry.recipientId,
      action: entry.action,
      amount: entry.amount,
      currency: entry.currency,
      risk_score: entry.riskScore,
      security_flag: entry.securityFlag,
      fraud_check_result: entry.fraudCheckResult,
      reason: entry.reason,
      idempotency_key: entry.idempotencyKey,
      device_id: entry.deviceId,
      country: entry.country,
      created_at: entry.createdAt,
    } as any);
  } catch (err) {
    console.warn("[TransactionRiskLog] persist failed:", err);
  }
}

export function getRecentRiskEntries(userId: string, limit = 20): TransactionRiskEntry[] {
  return riskLog
    .filter(e => e.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getBlockedTransactions(userId: string): TransactionRiskEntry[] {
  return riskLog.filter(e => e.userId === userId && e.fraudCheckResult === "blocked");
}

export function getHighRiskTransactions(limit = 50): TransactionRiskEntry[] {
  return riskLog
    .filter(e => e.riskScore >= 60)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

export async function queryTransactionRiskLog(filters: {
  userId?: string;
  minRiskScore?: number;
  result?: "passed" | "blocked" | "flagged";
  since?: number;
  limit?: number;
}): Promise<TransactionRiskEntry[]> {
  try {
    let query = db.from("transaction_risk_log" as any).select("*");

    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.result) query = query.eq("fraud_check_result", filters.result);
    if (filters.minRiskScore) query = query.gte("risk_score", filters.minRiskScore);
    if (filters.since) query = query.gte("created_at", new Date(filters.since).toISOString());

    query = query.order("created_at", { ascending: false }).limit(filters.limit || 50);

    const { data } = await query;
    if (!data) return [];

    return (data as any[]).map(row => ({
      transactionId: row.transaction_id,
      userId: row.user_id,
      recipientId: row.recipient_id,
      action: row.action,
      amount: row.amount,
      currency: row.currency,
      riskScore: row.risk_score,
      securityFlag: row.security_flag,
      fraudCheckResult: row.fraud_check_result,
      reason: row.reason,
      idempotencyKey: row.idempotency_key,
      deviceId: row.device_id,
      country: row.country,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function markAsReviewed(transactionId: string, reviewedBy: string): Promise<void> {
  try {
    await db.from("transaction_risk_log" as any).update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    } as any).eq("transaction_id", transactionId);
  } catch (err) {
    console.warn("[TransactionRiskLog] markAsReviewed failed:", err);
  }
}
