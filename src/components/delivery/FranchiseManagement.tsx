/**
 * FranchiseManagement — VVV. Franchise Management.
 * Franchisee onboarding, exclusive territories, auto royalties, multi-franchise reporting.
 * PASS102-VVV
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, MapPin, Percent, Users, FileText,
  TrendingUp, CheckCircle2, Clock, Star, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Franchise {
  id: string;
  name: string;
  owner: string;
  territory: string;
  status: "active" | "onboarding" | "suspended";
  revenue: number;
  royaltyRate: number;
  royaltyPaid: number;
  drivers: number;
  orders: number;
  rating: number;
  startDate: Date;
}

const FRANCHISES: Franchise[] = [
  { id: "f1", name: "Easy-Locs Dakar Centre", owner: "Moussa D.", territory: "Dakar Centre + Plateau", status: "active", revenue: 8500000, royaltyRate: 8, royaltyPaid: 680000, drivers: 18, orders: 842, rating: 4.7, startDate: new Date("2025-03-15") },
  { id: "f2", name: "Easy-Locs Médina", owner: "Aminata S.", territory: "Médina + HLM", status: "active", revenue: 5200000, royaltyRate: 8, royaltyPaid: 416000, drivers: 12, orders: 534, rating: 4.5, startDate: new Date("2025-06-01") },
  { id: "f3", name: "Easy-Locs Pikine", owner: "Cheikh B.", territory: "Pikine + Guédiawaye", status: "active", revenue: 3800000, royaltyRate: 10, royaltyPaid: 380000, drivers: 8, orders: 356, rating: 4.2, startDate: new Date("2025-09-15") },
  { id: "f4", name: "Easy-Locs Rufisque", owner: "Fatou N.", territory: "Rufisque + Bargny", status: "onboarding", revenue: 0, royaltyRate: 10, royaltyPaid: 0, drivers: 0, orders: 0, rating: 0, startDate: new Date("2026-03-01") },
];

export default function FranchiseManagement({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"overview" | "territories" | "royalties" | "performance">("overview");

  const totalRevenue = FRANCHISES.reduce((s, f) => s + f.revenue, 0);
  const totalRoyalties = FRANCHISES.reduce((s, f) => s + f.royaltyPaid, 0);
  const activeFranchises = FRANCHISES.filter(f => f.status === "active").length;
  const totalDrivers = FRANCHISES.reduce((s, f) => s + f.drivers, 0);
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}k`;

  const statusCfg = (s: string) => ({
    active: { label: "Actif", color: "--success", icon: "✅" },
    onboarding: { label: "Onboarding", color: "--warning", icon: "⏳" },
    suspended: { label: "Suspendu", color: "--destructive", icon: "⛔" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Building2 className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Gestion franchises
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Franchises", value: activeFranchises, color: "--primary" },
          { label: "Revenue", value: fmt(totalRevenue), color: "--success" },
          { label: "Redevances", value: fmt(totalRoyalties), color: "--warning" },
          { label: "Livreurs", value: totalDrivers, color: "--info" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["overview", "territories", "royalties", "performance"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "overview" ? "🏢 Vue" : v === "territories" ? "🗺️ Zones" : v === "royalties" ? "💰 Redevances" : "📊 Perf."}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <div className="space-y-2">
          {FRANCHISES.map(f => {
            const cfg = statusCfg(f.status);
            return (
              <div key={f.id} className="rounded-xl p-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)", opacity: f.status === "suspended" ? 0.6 : 1 }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `hsl(var(${cfg.color}) / 0.1)` }}>
                    <Building2 className="h-4 w-4" style={{ color: `hsl(var(${cfg.color}))` }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{f.name}</p>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      👤 {f.owner} • 📍 {f.territory}
                    </p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🚗 {f.drivers} livreurs • 📦 {f.orders} commandes {f.rating > 0 ? `• ⭐ ${f.rating}` : ""}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold shrink-0" style={{ color: "hsl(var(--primary))" }}>{fmt(f.revenue)} F</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "territories" && (
        <div className="space-y-2">
          {FRANCHISES.map(f => (
            <div key={f.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: `1px solid ${f.status === "active" ? "hsl(var(--success) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
              <MapPin className="h-4 w-4" style={{ color: f.status === "active" ? "hsl(var(--success))" : "hsl(var(--warning))" }} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{f.territory}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{f.name} • {f.owner}</p>
              </div>
              <span className="text-[8px] font-bold px-2 py-1 rounded-full"
                style={{ background: f.status === "active" ? "hsl(var(--success) / 0.1)" : "hsl(var(--warning) / 0.1)", color: f.status === "active" ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
                {f.status === "active" ? "🔒 Exclusif" : "⏳ En cours"}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === "royalties" && (
        <div className="space-y-2">
          {FRANCHISES.filter(f => f.status === "active").map(f => (
            <div key={f.id} className="rounded-xl p-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{f.name}</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>{f.royaltyRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>Revenue: {fmt(f.revenue)} F</span>
                <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>Redevance: {f.royaltyPaid.toLocaleString()} F</span>
              </div>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${f.royaltyRate}%` }} className="h-full rounded-full" style={{ background: "hsl(var(--success))" }} />
              </div>
            </div>
          ))}
          <div className="rounded-xl p-3 mt-2" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
            <div className="flex justify-between">
              <span className="text-[11px] font-bold" style={{ color: "hsl(var(--foreground))" }}>Total redevances</span>
              <span className="text-[11px] font-bold" style={{ color: "hsl(var(--success))" }}>{totalRoyalties.toLocaleString()} F</span>
            </div>
          </div>
        </div>
      )}

      {view === "performance" && (
        <div className="space-y-2">
          {FRANCHISES.filter(f => f.status === "active").sort((a, b) => b.revenue - a.revenue).map((f, i) => (
            <div key={f.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: `1px solid ${i === 0 ? "hsl(var(--warning) / 0.2)" : "hsl(var(--border) / 0.08)"}` }}>
              <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{f.name}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {f.orders} commandes • ⭐ {f.rating} • {f.drivers} livreurs
                </p>
              </div>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--primary))" }}>{fmt(f.revenue)} F</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
