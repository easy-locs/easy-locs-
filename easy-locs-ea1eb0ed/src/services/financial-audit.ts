import { db } from "./db";

export interface FinancialAuditEntry {
  user_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  counterparty_id?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  payment_method?: string | null;
  stripe_payment_intent_id?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
}

export async function recordFinancialAudit(entry: FinancialAuditEntry): Promise<void> {
  try {
    await db("financial_audit_trail").insert({
      user_id: entry.user_id,
      transaction_type: entry.transaction_type,
      amount: entry.amount,
      currency: entry.currency,
      counterparty_id: entry.counterparty_id ?? null,
      reference_id: entry.reference_id ?? null,
      reference_type: entry.reference_type ?? null,
      payment_method: entry.payment_method ?? null,
      stripe_payment_intent_id: entry.stripe_payment_intent_id ?? null,
      status: entry.status ?? "completed",
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    console.error("[financial-audit] Failed to record audit entry:", err);
  }
}

export async function fetchUserAuditTrail(
  userId: string,
  opts?: { limit?: number; offset?: number; type?: string },
): Promise<FinancialAuditEntry[]> {
  let query = db("financial_audit_trail")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (opts?.type) query = query.eq("transaction_type", opts.type);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FinancialAuditEntry[];
}

interface AuditTrailRow extends FinancialAuditEntry {
  created_at?: string;
}

export async function exportAuditTrailCSV(userId: string): Promise<string> {
  const entries = await fetchUserAuditTrail(userId, { limit: 10000 });
  const header = "date,type,amount,currency,status,reference_type,reference_id,payment_method,counterparty_id";
  const rows = (entries as AuditTrailRow[]).map((e) =>
    [
      e.created_at ?? "",
      e.transaction_type,
      e.amount,
      e.currency,
      e.status ?? "",
      e.reference_type ?? "",
      e.reference_id ?? "",
      e.payment_method ?? "",
      e.counterparty_id ?? "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  return [header, ...rows].join("\n");
}
