/**
 * AdvancedReturnsHub — MMM. Advanced Returns Hub.
 * Return tracking, auto-refund, categorized reasons, seller/zone stats.
 * PASS100-MMM
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw, Package, CheckCircle2, Clock, AlertTriangle,
  TrendingDown, MapPin, User, CreditCard, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface ReturnItem {
  id: string;
  orderId: string;
  product: string;
  reason: string;
  status: "requested" | "in_transit" | "received" | "refunded" | "rejected";
  customer: string;
  seller: string;
  zone: string;
  amount: number;
  requestedAt: Date;
  refundedAt?: Date;
}

const REASONS = ["Produit endommagé", "Mauvais article", "Taille incorrecte", "Non conforme", "Délai dépassé", "Changement d'avis"];

const MOCK_RETURNS: ReturnItem[] = [
  { id: "r1", orderId: "#2847", product: "Smartphone Samsung A54", reason: "Produit endommagé", status: "requested", customer: "Awa N.", seller: "TechShop DK", zone: "Dakar Centre", amount: 185000, requestedAt: new Date(Date.now() - 3600000) },
  { id: "r2", orderId: "#2841", product: "Chaussures Nike Air", reason: "Taille incorrecte", status: "in_transit", customer: "Mamadou S.", seller: "Fashion Store", zone: "Plateau", amount: 45000, requestedAt: new Date(Date.now() - 86400000) },
  { id: "r3", orderId: "#2835", product: "Casque Bluetooth JBL", reason: "Non conforme", status: "received", customer: "Fatou D.", seller: "AudioPro", zone: "Médina", amount: 28000, requestedAt: new Date(Date.now() - 172800000) },
  { id: "r4", orderId: "#2820", product: "Sac à dos Samsonite", reason: "Mauvais article", status: "refunded", customer: "Ibrahima K.", seller: "BagStore", zone: "Parcelles", amount: 35000, requestedAt: new Date(Date.now() - 259200000), refundedAt: new Date(Date.now() - 172800000) },
  { id: "r5", orderId: "#2815", product: "Montre connectée", reason: "Produit endommagé", status: "rejected", customer: "Aïcha M.", seller: "TechShop DK", zone: "Guédiawaye", amount: 62000, requestedAt: new Date(Date.now() - 345600000) },
];

export default function AdvancedReturnsHub({ orgId, className }: { orgId: string; className?: string }) {
  const [returns, setReturns] = useState(MOCK_RETURNS);
  const [view, setView] = useState<"list" | "stats" | "reasons">("list");

  const totalReturns = returns.length;
  const pendingRefunds = returns.filter(r => ["requested", "in_transit", "received"].includes(r.status)).length;
  const refundedAmount = returns.filter(r => r.status === "refunded").reduce((s, r) => s + r.amount, 0);
  const returnRate = 4.2;

  const processRefund = (id: string) => {
    haptic("medium");
    setReturns(prev => prev.map(r => r.id === id ? { ...r, status: "refunded" as const, refundedAt: new Date() } : r));
    toast.success("💰 Remboursement effectué");
  };

  const statusConfig = (s: string) => ({
    requested: { label: "Demandé", color: "--warning", icon: "⏳" },
    in_transit: { label: "En transit", color: "--info", icon: "🚚" },
    received: { label: "Reçu", color: "--primary", icon: "📦" },
    refunded: { label: "Remboursé", color: "--success", icon: "✅" },
    rejected: { label: "Rejeté", color: "--destructive", icon: "❌" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  const reasonStats = REASONS.map(r => ({
    reason: r,
    count: returns.filter(ret => ret.reason === r).length,
  })).sort((a, b) => b.count - a.count);

  const sellerStats = [...new Set(returns.map(r => r.seller))].map(s => ({
    seller: s,
    returns: returns.filter(r => r.seller === s).length,
    amount: returns.filter(r => r.seller === s).reduce((sum, r) => sum + r.amount, 0),
  })).sort((a, b) => b.returns - a.returns);

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <RotateCcw className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
          Centre de retours
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Total", value: totalReturns, color: "--primary" },
          { label: "En cours", value: pendingRefunds, color: "--warning" },
          { label: "Remboursé", value: `${(refundedAmount / 1000).toFixed(0)}k`, color: "--success" },
          { label: "Taux retour", value: `${returnRate}%`, color: "--destructive" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["list", "stats", "reasons"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "list" ? "📋 Retours" : v === "stats" ? "📊 Vendeurs" : "📈 Motifs"}
          </button>
        ))}
      </div>

      {view === "list" && (
        <div className="space-y-2">
          {returns.map(r => {
            const cfg = statusConfig(r.status);
            return (
              <div key={r.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-start gap-3">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{r.product}</p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {r.orderId} • {r.customer} • {r.seller}
                    </p>
                    <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--warning))" }}>Motif : {r.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold" style={{ color: `hsl(var(${cfg.color}))` }}>
                      {r.amount.toLocaleString()} F
                    </p>
                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
                {r.status === "received" && (
                  <Button size="sm" className="w-full mt-2 text-[9px] h-7" onClick={() => processRefund(r.id)}
                    style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                    <CreditCard className="h-3 w-3 mr-1" /> Rembourser automatiquement
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "stats" && (
        <div className="space-y-2">
          {sellerStats.map(s => (
            <div key={s.seller} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <User className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.seller}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{s.returns} retour{s.returns > 1 ? "s" : ""}</p>
              </div>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--destructive))" }}>{s.amount.toLocaleString()} F</p>
            </div>
          ))}
        </div>
      )}

      {view === "reasons" && (
        <div className="space-y-2">
          {reasonStats.filter(r => r.count > 0).map(r => (
            <div key={r.reason} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{r.reason}</p>
                <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(r.count / totalReturns) * 100}%` }}
                    className="h-full rounded-full" style={{ background: "hsl(var(--warning))" }} />
                </div>
              </div>
              <span className="text-[11px] font-bold" style={{ color: "hsl(var(--primary))" }}>{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
