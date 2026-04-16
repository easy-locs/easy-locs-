/**
 * ReturnsManagement — DDD. Returns & Reverse Logistics
 * Return requests, reverse pickup, refund tracking, reconditioning.
 * PASS91-DDD
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Package, Clock, CheckCircle2, XCircle, Truck, DollarSign, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeliveryReturns, useUpdateMutation } from "@/hooks/useDeliveryData";

type ReturnStatus = "requested" | "approved" | "pickup_scheduled" | "in_transit" | "received" | "inspected" | "refunded" | "rejected";

const STATUS_CFG: Record<ReturnStatus, { label: string; emoji: string; color: string }> = {
  requested: { label: "Demandé", emoji: "📩", color: "hsl(var(--warning))" },
  approved: { label: "Approuvé", emoji: "✅", color: "hsl(var(--success))" },
  pickup_scheduled: { label: "Collecte planifiée", emoji: "🚚", color: "hsl(var(--info))" },
  in_transit: { label: "En transit", emoji: "📦", color: "hsl(var(--hud-cyan))" },
  received: { label: "Reçu", emoji: "📥", color: "hsl(var(--info))" },
  inspected: { label: "Inspecté", emoji: "🔍", color: "hsl(var(--warning))" },
  refunded: { label: "Remboursé", emoji: "💰", color: "hsl(var(--success))" },
  rejected: { label: "Rejeté", emoji: "❌", color: "hsl(var(--destructive))" },
};

const GRADE_CFG: Record<string, { label: string; color: string }> = {
  A: { label: "Comme neuf", color: "hsl(var(--success))" },
  B: { label: "Bon état", color: "hsl(var(--info))" },
  C: { label: "Usure visible", color: "hsl(var(--warning))" },
  D: { label: "Endommagé", color: "hsl(var(--destructive))" },
};

export default function ReturnsManagement({ orgId }: { orgId: string }) {
  const { data: returns = [], isLoading } = useDeliveryReturns(orgId);
  const updateReturn = useUpdateMutation("storefront_returns");
  const [tab, setTab] = useState<"all" | "pending" | "processing" | "completed">("all");
  const [search, setSearch] = useState("");

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const filtered = (() => {
    let items = returns as any[];
    if (tab === "pending") items = items.filter((r: any) => ["requested"].includes(r.status));
    if (tab === "processing") items = items.filter((r: any) => ["approved", "pickup_scheduled", "in_transit", "received", "inspected"].includes(r.status));
    if (tab === "completed") items = items.filter((r: any) => ["refunded", "rejected"].includes(r.status));
    if (search) items = items.filter((r: any) =>
      (r.customer_name || r.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.order_id || r.orderId || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.product_description || r.productDescription || "").toLowerCase().includes(search.toLowerCase())
    );
    return items;
  })();

  const stats = {
    total: returns.length,
    pending: returns.filter((r: any) => r.status === "requested").length,
    refunded: returns.filter((r: any) => r.status === "refunded").reduce((s: number, r: any) => s + (r.refund_amount || r.refundAmount || 0), 0),
    rejectionRate: returns.length > 0 ? Math.round(returns.filter((r: any) => r.status === "rejected").length / returns.length * 100) : 0,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Retours & Logistique inverse</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "Total", value: stats.total, color: "--hud-cyan" },
          { label: "En attente", value: stats.pending, color: "--warning" },
          { label: "Remboursé", value: `${stats.refunded.toFixed(0)}€`, color: "--success" },
          { label: "Rejet", value: `${stats.rejectionRate}%`, color: "--destructive" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[0.625rem] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "all" as const, label: "📋 Tous" },
          { id: "pending" as const, label: "⏳ En attente" },
          { id: "processing" as const, label: "🔄 En cours" },
          { id: "completed" as const, label: "✅ Terminés" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[0.625rem] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--warning) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <Input placeholder="Rechercher par client, commande…" value={search} onChange={e => setSearch(e.target.value)}
        className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />

      {/* Returns list */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
          {filtered.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun retour trouvé</div>
          )}
          {filtered.map((ret: any) => {
            const cfg = STATUS_CFG[ret.status as ReturnStatus] || STATUS_CFG.requested;
            const productDesc = ret.product_description || ret.productDescription || "";
            const orderId = ret.order_id || ret.orderId || "";
            const customerName = ret.customer_name || ret.customerName || "";
            const refundAmount = ret.refund_amount || ret.refundAmount || 0;
            const requestedAt = ret.requested_at || ret.requestedAt || ret.created_at || "";
            const pickupScheduledAt = ret.pickup_scheduled_at || ret.pickupScheduledAt || "";
            const receivedAt = ret.received_at || ret.receivedAt || "";
            const conditionGrade = ret.condition_grade || ret.conditionGrade;
            const inspectionNotes = ret.inspection_notes || ret.inspectionNotes;
            const reason = ret.reason || "";
            return (
              <div key={ret.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.6875rem] font-bold truncate" style={{ color: "hsl(var(--hud-text))" }}>{productDesc}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{orderId}</span>
                      <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>• {customerName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[0.625rem] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    <p className="text-[0.625rem] font-bold mt-0.5" style={{ color: "hsl(var(--hud-cyan))" }}>{Number(refundAmount).toFixed(2)} €</p>
                  </div>
                </div>

                {/* Reason */}
                {reason && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: "hsl(var(--hud-bg))" }}>
                    <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--warning) / 0.6)" }} />
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{reason}</p>
                  </div>
                )}

                {/* Inspection */}
                {conditionGrade && GRADE_CFG[conditionGrade] && (
                  <div className="flex items-center gap-2">
                    <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded" style={{
                      background: `${GRADE_CFG[conditionGrade].color}15`,
                      color: GRADE_CFG[conditionGrade].color,
                    }}>Grade {conditionGrade}: {GRADE_CFG[conditionGrade].label}</span>
                    {inspectionNotes && (
                      <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{inspectionNotes}</span>
                    )}
                  </div>
                )}

                {/* Timeline */}
                <div className="flex items-center gap-3 text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {requestedAt && <span>📅 {new Date(requestedAt).toLocaleDateString("fr-FR")}</span>}
                  {pickupScheduledAt && <span>🚚 {new Date(pickupScheduledAt).toLocaleDateString("fr-FR")}</span>}
                  {receivedAt && <span>📥 {new Date(receivedAt).toLocaleDateString("fr-FR")}</span>}
                </div>

                {/* Actions for pending */}
                {ret.status === "requested" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 text-[0.625rem] h-7"
                      onClick={() => updateReturn.mutate({ id: ret.id, status: "approved" })}
                      style={{ background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))" }}>
                      ✅ Approuver
                    </Button>
                    <Button size="sm" className="flex-1 text-[0.625rem] h-7"
                      onClick={() => updateReturn.mutate({ id: ret.id, status: "rejected" })}
                      style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
                      ❌ Rejeter
                    </Button>
                  </div>
                )}
                {ret.status === "inspected" && (
                  <Button size="sm" className="w-full text-[0.625rem] h-7"
                    onClick={() => updateReturn.mutate({ id: ret.id, status: "refunded" })}
                    style={{ background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))" }}>
                    💰 Procéder au remboursement
                  </Button>
                )}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
