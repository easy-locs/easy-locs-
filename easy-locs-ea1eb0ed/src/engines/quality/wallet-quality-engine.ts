import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { db } from "@/services/db";

interface WalletFinding {
  type: "stuck_transaction" | "missing_receipt" | "balance_inconsistency" | "slow_checkout" | "orphan_payment";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
  count?: number;
}

export class WalletQualityEngine extends BaseEngine {
  private findings: WalletFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-wallet",
      name: "Wallet Quality Engine",
      category: "quality",
      intervalMs: 180_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: WalletFinding[] = [];

    try {
      const { data: pending } = await db("wallet_transactions")
        .select("id, created_at, status, amount")
        .eq("status", "pending")
        .limit(200);

      if (pending) {
        const now = Date.now();
        const stuckTxns = pending.filter(t => {
          const age = now - new Date(t.created_at).getTime();
          return age > 3600000;
        });

        if (stuckTxns.length > 0) {
          findings.push({
            type: "stuck_transaction",
            severity: "high",
            detail: `${stuckTxns.length} transactions stuck in pending for over 1 hour`,
            recommendation: "Investigate pending transactions — may need manual resolution or retry",
            count: stuckTxns.length,
          });
        }
      }
    } catch {}

    try {
      const { data: failedTxns } = await db("wallet_transactions")
        .select("id, status, error_message")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(50);

      if (failedTxns && failedTxns.length > 10) {
        const errorPatterns = new Map<string, number>();
        for (const txn of failedTxns) {
          const key = txn.error_message?.substring(0, 60) || "unknown";
          errorPatterns.set(key, (errorPatterns.get(key) || 0) + 1);
        }
        for (const [pattern, count] of errorPatterns) {
          if (count >= 3) {
            findings.push({
              type: "orphan_payment",
              severity: "high",
              detail: `Recurring payment failure (${count}x): "${pattern}"`,
              recommendation: "Fix the root cause of recurring payment failures",
              count,
            });
          }
        }
      }
    } catch {}

    const checkoutDuration = performance.getEntriesByName("checkout-complete");
    if (checkoutDuration.length > 0) {
      const avg = checkoutDuration.reduce((s, e) => s + e.duration, 0) / checkoutDuration.length;
      if (avg > 5000) {
        findings.push({
          type: "slow_checkout",
          severity: "medium",
          detail: `Average checkout time: ${Math.round(avg)}ms (target: <3000ms)`,
          recommendation: "Optimize checkout flow — reduce API calls and loading states",
        });
      }
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 20 - findings.filter(f => f.severity === "medium").length * 8);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
