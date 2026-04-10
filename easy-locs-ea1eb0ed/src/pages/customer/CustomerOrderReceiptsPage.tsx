import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderReceipts } from "@/repositories/customer-orders.repository";
import { motion } from "framer-motion";
import { ArrowLeft, Receipt, FileText, CheckCircle2, Clock, XCircle, Download } from "lucide-react";

const PAYMENT_META: Record<string, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  paid: { color: "hsl(152 60% 42%)", icon: CheckCircle2, label: "Paid" },
  completed: { color: "hsl(152 60% 42%)", icon: CheckCircle2, label: "Completed" },
  refunded: { color: "hsl(210 80% 52%)", icon: Download, label: "Refunded" },
  pending: { color: "hsl(38 92% 50%)", icon: Clock, label: "Pending" },
  unpaid: { color: "hsl(220 15% 50%)", icon: Clock, label: "Unpaid" },
  failed: { color: "hsl(350 65% 55%)", icon: XCircle, label: "Failed" },
};

export default function CustomerOrderReceiptsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["customer-order-receipts", user?.id],
    queryFn: () => fetchOrderReceipts(user!.id),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const totalSpent = rows.reduce((sum: number, r: any) => sum + Number(r.total_amount ?? 0), 0);
  const paidCount = rows.filter((r: any) => ["paid", "completed"].includes(r.payment_status)).length;

  return (
    <div className="app-mobile-page app-mobile-content bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/my-orders")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order Receipts</h1>
          <p className="text-xs text-muted-foreground">Billing history and payment proof</p>
        </div>
      </div>

      {!isLoading && rows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-4 grid grid-cols-3 gap-2"
        >
          <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(210 80% 52% / 0.06)", border: "1px solid hsl(210 80% 52% / 0.1)" }}>
            <FileText className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(210 80% 52%)" }} />
            <p className="text-lg font-bold text-foreground">{rows.length}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Orders</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(152 60% 42% / 0.06)", border: "1px solid hsl(152 60% 42% / 0.1)" }}>
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(152 60% 42%)" }} />
            <p className="text-lg font-bold text-foreground">{paidCount}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Paid</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(38 92% 50% / 0.06)", border: "1px solid hsl(38 92% 50% / 0.1)" }}>
            <Receipt className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(38 92% 50%)" }} />
            <p className="text-lg font-extrabold text-foreground tabular-nums">{totalSpent.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Total</p>
          </div>
        </motion.div>
      )}

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted) / 0.3)" }} />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "hsl(210 80% 52% / 0.08)" }}>
            <Receipt className="w-8 h-8" style={{ color: "hsl(210 80% 52%)" }} />
          </div>
          <p className="text-sm font-bold text-foreground">No receipts yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your order receipts will appear here after purchases</p>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-2.5">
          {rows.map((row: any, idx: number) => {
            const pStatus = row.payment_status || "unpaid";
            const meta = PAYMENT_META[pStatus] ?? PAYMENT_META.unpaid;
            const StatusIcon = meta.icon;
            const dateStr = row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
            const timeStr = row.created_at ? new Date(row.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";

            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                className="rounded-2xl bg-card p-4"
                style={{ border: "1px solid hsl(var(--border) / 0.1)" }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}12` }}>
                    <StatusIcon className="w-5 h-5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">Receipt #{String(row.id).slice(0, 8)}</p>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${meta.color}15`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold" style={{ color: "hsl(var(--primary))" }}>
                        {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-muted-foreground">{dateStr} {timeStr}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/tracking/${row.id}`); }}
                        className="text-[11px] font-bold px-3 py-1 rounded-lg active:scale-95 transition-transform"
                        style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
