/**
 * Wallet Reconciliation — Daily audit of ledger vs. external gateway.
 *
 * Pure functions that take the day's ledger entries and the matching gateway
 * (e.g. Stripe Connect) settlements and emit a reconciliation report with
 * detected discrepancies.
 */

export type LedgerEntryType = "credit" | "debit";

export interface LedgerEntryLite {
  id: string;
  reference: string;
  type: LedgerEntryType;
  amount: number;
  currency: string;
  occurredAt: string;
  status?: "posted" | "pending" | "reversed";
}

export interface GatewayTxnLite {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  direction: LedgerEntryType;
  occurredAt: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
}

export interface ReconDiscrepancy {
  kind:
    | "missing_in_ledger"
    | "missing_in_gateway"
    | "amount_mismatch"
    | "currency_mismatch"
    | "status_mismatch"
    | "direction_mismatch";
  reference: string;
  ledgerAmount?: number;
  gatewayAmount?: number;
  detail: string;
}

export interface ReconciliationReport {
  date: string;
  ledgerCount: number;
  gatewayCount: number;
  matched: number;
  totalLedgerAmount: number;
  totalGatewayAmount: number;
  netDeltaByCurrency: Record<string, number>;
  discrepancies: ReconDiscrepancy[];
  healthy: boolean;
}

function signed(entry: { type: LedgerEntryType; amount: number }): number {
  return entry.type === "credit" ? entry.amount : -entry.amount;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function reconcile(
  date: string,
  ledger: LedgerEntryLite[],
  gateway: GatewayTxnLite[],
): ReconciliationReport {
  const ledgerByRef = new Map<string, LedgerEntryLite>();
  for (const l of ledger) {
    if (l.status === "reversed") continue;
    ledgerByRef.set(l.reference, l);
  }

  const gatewayByRef = new Map<string, GatewayTxnLite>();
  for (const g of gateway) {
    if (g.status === "failed") continue;
    gatewayByRef.set(g.reference, g);
  }

  const discrepancies: ReconDiscrepancy[] = [];
  let matched = 0;

  for (const [ref, g] of gatewayByRef) {
    const l = ledgerByRef.get(ref);
    if (!l) {
      discrepancies.push({
        kind: "missing_in_ledger",
        reference: ref,
        gatewayAmount: g.amount,
        detail: `Gateway ${g.id} has no ledger entry`,
      });
      continue;
    }
    if (l.currency !== g.currency) {
      discrepancies.push({
        kind: "currency_mismatch",
        reference: ref,
        detail: `ledger=${l.currency} vs gateway=${g.currency}`,
      });
      continue;
    }
    if (l.type !== g.direction) {
      discrepancies.push({
        kind: "direction_mismatch",
        reference: ref,
        ledgerAmount: l.amount,
        gatewayAmount: g.amount,
        detail: `ledger=${l.type} vs gateway=${g.direction}`,
      });
      continue;
    }
    if (Math.abs(l.amount - g.amount) > 0.01) {
      discrepancies.push({
        kind: "amount_mismatch",
        reference: ref,
        ledgerAmount: l.amount,
        gatewayAmount: g.amount,
        detail: `Δ=${round2(l.amount - g.amount)}`,
      });
      continue;
    }
    if (g.status === "refunded" && l.status !== "reversed") {
      discrepancies.push({
        kind: "status_mismatch",
        reference: ref,
        detail: `Gateway refunded but ledger ${l.status ?? "posted"}`,
      });
      continue;
    }
    matched += 1;
  }

  for (const [ref, l] of ledgerByRef) {
    if (!gatewayByRef.has(ref)) {
      discrepancies.push({
        kind: "missing_in_gateway",
        reference: ref,
        ledgerAmount: l.amount,
        detail: `Ledger ${l.id} has no gateway record`,
      });
    }
  }

  const netDeltaByCurrency: Record<string, number> = {};
  let totalLedgerAmount = 0;
  let totalGatewayAmount = 0;
  for (const l of ledgerByRef.values()) {
    totalLedgerAmount += l.amount;
    netDeltaByCurrency[l.currency] = (netDeltaByCurrency[l.currency] ?? 0) + signed(l);
  }
  for (const g of gatewayByRef.values()) totalGatewayAmount += g.amount;

  for (const k of Object.keys(netDeltaByCurrency)) {
    netDeltaByCurrency[k] = round2(netDeltaByCurrency[k]);
  }

  return {
    date,
    ledgerCount: ledgerByRef.size,
    gatewayCount: gatewayByRef.size,
    matched,
    totalLedgerAmount: round2(totalLedgerAmount),
    totalGatewayAmount: round2(totalGatewayAmount),
    netDeltaByCurrency,
    discrepancies,
    healthy: discrepancies.length === 0,
  };
}

/**
 * Compute running balance from an ordered ledger — used for reconciliation and
 * detection of negative-balance anomalies.
 */
export function runningBalance(entries: LedgerEntryLite[]): number {
  let bal = 0;
  for (const e of entries) {
    if (e.status === "reversed") continue;
    bal += signed(e);
  }
  return round2(bal);
}
