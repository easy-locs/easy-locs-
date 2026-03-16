/**
 * SellerPartnerPortal — PPP. Seller Partner Portal.
 * Seller onboarding, contracts, performance, commission tracking, support.
 * PASS100-PPP
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Store, FileText, TrendingUp, Percent, HeadphonesIcon,
  CheckCircle2, Clock, Star, Users, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface SellerPartner {
  id: string;
  name: string;
  status: "active" | "pending" | "suspended";
  joinedAt: Date;
  totalOrders: number;
  revenue: number;
  commissionRate: number;
  commissionPaid: number;
  rating: number;
  contractExpiry: Date;
  zone: string;
}

const MOCK_SELLERS: SellerPartner[] = [
  { id: "s1", name: "TechShop Dakar", status: "active", joinedAt: new Date("2025-06-15"), totalOrders: 342, revenue: 4850000, commissionRate: 12, commissionPaid: 582000, rating: 4.7, contractExpiry: new Date("2026-06-15"), zone: "Dakar Centre" },
  { id: "s2", name: "Fashion Store SN", status: "active", joinedAt: new Date("2025-09-01"), totalOrders: 218, revenue: 3120000, commissionRate: 10, commissionPaid: 312000, rating: 4.5, contractExpiry: new Date("2026-09-01"), zone: "Plateau" },
  { id: "s3", name: "AudioPro Médina", status: "active", joinedAt: new Date("2025-11-10"), totalOrders: 156, revenue: 1980000, commissionRate: 12, commissionPaid: 237600, rating: 4.2, contractExpiry: new Date("2026-11-10"), zone: "Médina" },
  { id: "s4", name: "BagStore Express", status: "pending", joinedAt: new Date("2026-02-20"), totalOrders: 45, revenue: 520000, commissionRate: 15, commissionPaid: 78000, rating: 3.8, contractExpiry: new Date("2027-02-20"), zone: "Parcelles" },
  { id: "s5", name: "FreshFood DK", status: "suspended", joinedAt: new Date("2025-08-05"), totalOrders: 89, revenue: 890000, commissionRate: 8, commissionPaid: 71200, rating: 3.2, contractExpiry: new Date("2026-08-05"), zone: "Pikine" },
];

const SUPPORT_TICKETS = [
  { id: "t1", seller: "TechShop Dakar", subject: "Problème facturation mars", status: "open", priority: "high" },
  { id: "t2", seller: "Fashion Store SN", subject: "Demande augmentation zone", status: "in_progress", priority: "medium" },
  { id: "t3", seller: "AudioPro Médina", subject: "Retard paiement commission", status: "resolved", priority: "low" },
];

export default function SellerPartnerPortal({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"sellers" | "contracts" | "commissions" | "support">("sellers");
  const [sellers] = useState(MOCK_SELLERS);

  const totalRevenue = sellers.reduce((s, p) => s + p.revenue, 0);
  const totalCommissions = sellers.reduce((s, p) => s + p.commissionPaid, 0);
  const activeSellers = sellers.filter(s => s.status === "active").length;
  const avgRating = (sellers.reduce((s, p) => s + p.rating, 0) / sellers.length).toFixed(1);

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}k`;

  const statusConfig = (s: string) => ({
    active: { label: "Actif", color: "--success", icon: "✅" },
    pending: { label: "En attente", color: "--warning", icon: "⏳" },
    suspended: { label: "Suspendu", color: "--destructive", icon: "⛔" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Store className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Portail partenaires
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Vendeurs actifs", value: activeSellers, color: "--success" },
          { label: "Revenue total", value: fmt(totalRevenue), color: "--primary" },
          { label: "Commissions", value: fmt(totalCommissions), color: "--warning" },
          { label: "Note moy.", value: `⭐ ${avgRating}`, color: "--info" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["sellers", "contracts", "commissions", "support"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "sellers" ? "🏪 Vendeurs" : v === "contracts" ? "📄 Contrats" : v === "commissions" ? "💰 Commissions" : "🎧 Support"}
          </button>
        ))}
      </div>

      {view === "sellers" && (
        <div className="space-y-2">
          {sellers.map(s => {
            const cfg = statusConfig(s.status);
            return (
              <div key={s.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)", opacity: s.status === "suspended" ? 0.6 : 1 }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: `hsl(var(${cfg.color}) / 0.1)` }}>
                    <Store className="h-4 w-4" style={{ color: `hsl(var(${cfg.color}))` }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.name}</p>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📍 {s.zone} • ⭐ {s.rating} • {s.totalOrders} commandes
                    </p>
                  </div>
                  <p className="text-[10px] font-bold shrink-0" style={{ color: "hsl(var(--primary))" }}>{fmt(s.revenue)} F</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "contracts" && (
        <div className="space-y-2">
          {sellers.map(s => {
            const daysLeft = Math.ceil((s.contractExpiry.getTime() - Date.now()) / 86400000);
            const isExpiring = daysLeft < 90;
            return (
              <div key={s.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: `1px solid ${isExpiring ? "hsl(var(--warning) / 0.2)" : "hsl(var(--border) / 0.08)"}` }}>
                <FileText className="h-4 w-4" style={{ color: isExpiring ? "hsl(var(--warning))" : "hsl(var(--primary))" }} />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.name}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Expire : {s.contractExpiry.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold" style={{
                    color: daysLeft > 180 ? "hsl(var(--success))" : daysLeft > 90 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                  }}>{daysLeft}j</p>
                  <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>restants</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "commissions" && (
        <div className="space-y-2">
          {sellers.filter(s => s.status === "active").map(s => (
            <div key={s.id} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.name}</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>
                  {s.commissionRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>Revenue : {fmt(s.revenue)} F</span>
                <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>
                  Commission : {s.commissionPaid.toLocaleString()} F
                </span>
              </div>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${s.commissionRate}%` }}
                  className="h-full rounded-full" style={{ background: "hsl(var(--success))" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "support" && (
        <div className="space-y-2">
          {SUPPORT_TICKETS.map(t => (
            <div key={t.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)", opacity: t.status === "resolved" ? 0.6 : 1 }}>
              <HeadphonesIcon className="h-4 w-4" style={{
                color: t.status === "open" ? "hsl(var(--warning))" : t.status === "resolved" ? "hsl(var(--success))" : "hsl(var(--info))",
              }} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{t.subject}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.seller}</p>
              </div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: t.status === "open" ? "hsl(var(--warning) / 0.1)" : t.status === "resolved" ? "hsl(var(--success) / 0.1)" : "hsl(var(--info) / 0.1)",
                  color: t.status === "open" ? "hsl(var(--warning))" : t.status === "resolved" ? "hsl(var(--success))" : "hsl(var(--info))",
                }}>
                {t.status === "open" ? "Ouvert" : t.status === "resolved" ? "Résolu" : "En cours"}
              </span>
            </div>
          ))}
          <Button className="w-full text-xs h-9 mt-2" onClick={() => { haptic("light"); toast.success("Ticket support créé"); }}
            style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
            <HeadphonesIcon className="h-3 w-3 mr-1" /> Créer un ticket support
          </Button>
        </div>
      )}
    </div>
  );
}
