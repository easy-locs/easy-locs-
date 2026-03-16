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

type ReturnStatus = "requested" | "approved" | "pickup_scheduled" | "in_transit" | "received" | "inspected" | "refunded" | "rejected";
type RefundMethod = "locs" | "original" | "store_credit";

interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  productDescription: string;
  reason: string;
  status: ReturnStatus;
  refundAmount: number;
  currency: string;
  refundMethod: RefundMethod;
  requestedAt: string;
  pickupScheduledAt?: string;
  receivedAt?: string;
  inspectionNotes?: string;
  conditionGrade?: "A" | "B" | "C" | "D";
}

const MOCK_RETURNS: ReturnRequest[] = [
  { id: "r1", orderId: "ORD-4521", customerName: "Marie D.", productDescription: "Robe en soie taille M", reason: "Taille incorrecte", status: "pickup_scheduled", refundAmount: 89.00, currency: "EUR", refundMethod: "original", requestedAt: "2026-03-15T14:00:00Z", pickupScheduledAt: "2026-03-17T10:00:00Z" },
  { id: "r2", orderId: "ORD-4498", customerName: "Jean P.", productDescription: "Casque audio Bluetooth", reason: "Produit défectueux", status: "inspected", refundAmount: 149.00, currency: "EUR", refundMethod: "original", requestedAt: "2026-03-13T09:00:00Z", receivedAt: "2026-03-15T11:00:00Z", inspectionNotes: "Défaut micro confirmé", conditionGrade: "C" },
  { id: "r3", orderId: "ORD-4510", customerName: "Sophie L.", productDescription: "Lot cosmétiques bio", reason: "Changement d'avis", status: "requested", refundAmount: 45.50, currency: "EUR", refundMethod: "store_credit", requestedAt: "2026-03-16T08:00:00Z" },
  { id: "r4", orderId: "ORD-4455", customerName: "Ali B.", productDescription: "Montre connectée", reason: "Non conforme à la description", status: "refunded", refundAmount: 199.00, currency: "EUR", refundMethod: "original", requestedAt: "2026-03-10T16:00:00Z", receivedAt: "2026-03-12T14:00:00Z", conditionGrade: "B" },
  { id: "r5", orderId: "ORD-4480", customerName: "Lucas M.", productDescription: "Chaussures running 43", reason: "Produit endommagé à la réception", status: "rejected", refundAmount: 120.00, currency: "EUR", refundMethod: "original", requestedAt: "2026-03-11T10:00:00Z", inspectionNotes: "Dommages causés par le client" },
];

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
  const [tab, setTab] = useState<"all" | "pending" | "processing" | "completed">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let items = MOCK_RETURNS;
    if (tab === "pending") items = items.filter(r => ["requested"].includes(r.status));
    if (tab === "processing") items = items.filter(r => ["approved", "pickup_scheduled", "in_transit", "received", "inspected"].includes(r.status));
    if (tab === "completed") items = items.filter(r => ["refunded", "rejected"].includes(r.status));
    if (search) items = items.filter(r =>
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.orderId.toLowerCase().includes(search.toLowerCase()) ||
      r.productDescription.toLowerCase().includes(search.toLowerCase())
    );
    return items;
  }, [tab, search]);

  const stats = useMemo(() => ({
    total: MOCK_RETURNS.length,
    pending: MOCK_RETURNS.filter(r => r.status === "requested").length,
    refunded: MOCK_RETURNS.filter(r => r.status === "refunded").reduce((s, r) => s + r.refundAmount, 0),
    rejectionRate: Math.round(MOCK_RETURNS.filter(r => r.status === "rejected").length / MOCK_RETURNS.length * 100),
  }), []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Retours & Logistique inverse</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Total", value: stats.total, color: "--hud-cyan" },
          { label: "En attente", value: stats.pending, color: "--warning" },
          { label: "Remboursé", value: `${stats.refunded.toFixed(0)}€`, color: "--success" },
          { label: "Rejet", value: `${stats.rejectionRate}%`, color: "--destructive" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
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
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
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
          {filtered.map(ret => {
            const cfg = STATUS_CFG[ret.status];
            return (
              <div key={ret.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate" style={{ color: "hsl(var(--hud-text))" }}>{ret.productDescription}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{ret.orderId}</span>
                      <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>• {ret.customerName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: "hsl(var(--hud-cyan))" }}>{ret.refundAmount.toFixed(2)} €</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: "hsl(var(--hud-bg))" }}>
                  <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--warning) / 0.6)" }} />
                  <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{ret.reason}</p>
                </div>

                {/* Inspection */}
                {ret.conditionGrade && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                      background: `${GRADE_CFG[ret.conditionGrade].color}15`,
                      color: GRADE_CFG[ret.conditionGrade].color,
                    }}>Grade {ret.conditionGrade}: {GRADE_CFG[ret.conditionGrade].label}</span>
                    {ret.inspectionNotes && (
                      <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{ret.inspectionNotes}</span>
                    )}
                  </div>
                )}

                {/* Timeline */}
                <div className="flex items-center gap-3 text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  <span>📅 {new Date(ret.requestedAt).toLocaleDateString("fr-FR")}</span>
                  {ret.pickupScheduledAt && <span>🚚 {new Date(ret.pickupScheduledAt).toLocaleDateString("fr-FR")}</span>}
                  {ret.receivedAt && <span>📥 {new Date(ret.receivedAt).toLocaleDateString("fr-FR")}</span>}
                </div>

                {/* Actions for pending */}
                {ret.status === "requested" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 text-[10px] h-7"
                      style={{ background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))" }}>
                      ✅ Approuver
                    </Button>
                    <Button size="sm" className="flex-1 text-[10px] h-7"
                      style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
                      ❌ Rejeter
                    </Button>
                  </div>
                )}
                {ret.status === "inspected" && (
                  <Button size="sm" className="w-full text-[10px] h-7"
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
