/**
 * FinancialReconPage — Live financial reconciliation board.
 */
import { useMemo, useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { useFinancialRecon } from "@/hooks/useFinancialRecon";
import { resolveReconciliation } from "@/lib/finance/reconcile";

export default function FinancialReconPage() {
  const { rows, loading } = useFinancialRecon();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = rows.length;
    const mismatch = rows.filter((r: any) => r.status === "mismatch").length;
    const matched = rows.filter((r: any) => r.status === "matched").length;
    const resolved = rows.filter((r: any) => r.status === "resolved").length;
    return { total, mismatch, matched, resolved };
  }, [rows]);

  const resolve = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveReconciliation({ reconId: id, notes: "Resolved manually by admin" });
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <BackCard />

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total },
            { label: "Mismatch", value: stats.mismatch },
            { label: "Matched", value: stats.matched },
            { label: "Resolved", value: stats.resolved },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {rows.map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{r.entity_type} · {r.status}</p>
                <p className="text-xs text-muted-foreground">
                  expected {r.expected_amount} / actual {r.actual_amount} / delta {r.delta} {r.currency}
                </p>
                {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
              </div>
              {r.status !== "resolved" && (
                <button
                  onClick={() => resolve(r.id)}
                  disabled={resolvingId === r.id}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {resolvingId === r.id ? "..." : "Resolve"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
