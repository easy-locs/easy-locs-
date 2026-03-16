/**
 * CarbonOffsetEngine — HHH2. Carbon Offset Engine.
 * Carbon compensation: per-delivery footprint, carbon credits, green certs, ESG dashboard.
 * PASS105-HHH2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Leaf, TrendingDown, Award, BarChart3,
  TreePine, Wind, Droplets, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface CarbonEntry {
  id: string;
  date: string;
  deliveries: number;
  co2Emitted: number;
  co2Offset: number;
  method: string;
  credits: number;
}

interface GreenCert {
  id: string;
  name: string;
  issuer: string;
  status: "active" | "pending" | "expired";
  validUntil: string;
  level: "bronze" | "silver" | "gold" | "platinum";
}

const CARBON_DATA: CarbonEntry[] = [
  { id: "ce1", date: "2026-03-16", deliveries: 47, co2Emitted: 23.5, co2Offset: 25.0, method: "Reforestation", credits: 12 },
  { id: "ce2", date: "2026-03-15", deliveries: 52, co2Emitted: 26.1, co2Offset: 28.0, method: "Éolien", credits: 14 },
  { id: "ce3", date: "2026-03-14", deliveries: 39, co2Emitted: 18.2, co2Offset: 20.0, method: "Solaire", credits: 10 },
  { id: "ce4", date: "2026-03-13", deliveries: 61, co2Emitted: 31.8, co2Offset: 35.0, method: "Reforestation", credits: 17 },
  { id: "ce5", date: "2026-03-12", deliveries: 44, co2Emitted: 21.0, co2Offset: 22.0, method: "Biomasse", credits: 11 },
];

const CERTS: GreenCert[] = [
  { id: "gc1", name: "Carbon Neutral Delivery", issuer: "Gold Standard", status: "active", validUntil: "2027-01-15", level: "gold" },
  { id: "gc2", name: "Green Logistics Partner", issuer: "EcoAct", status: "active", validUntil: "2026-12-01", level: "silver" },
  { id: "gc3", name: "Net Zero Fleet", issuer: "SBTi", status: "pending", validUntil: "2027-06-30", level: "platinum" },
];

export default function CarbonOffsetEngine({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"dashboard" | "credits" | "certs">("dashboard");

  const totalEmitted = CARBON_DATA.reduce((s, c) => s + c.co2Emitted, 0);
  const totalOffset = CARBON_DATA.reduce((s, c) => s + c.co2Offset, 0);
  const totalCredits = CARBON_DATA.reduce((s, c) => s + c.credits, 0);
  const netCarbon = totalEmitted - totalOffset;

  const levelCfg = (l: string) => ({
    bronze: { color: "--warning", emoji: "🥉" },
    silver: { color: "--muted-foreground", emoji: "🥈" },
    gold: { color: "--warning", emoji: "🥇" },
    platinum: { color: "--primary", emoji: "💎" },
  }[l] || { color: "--muted-foreground", emoji: "🏷️" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Leaf className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
        Moteur de compensation carbone
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "CO₂ émis", value: `${totalEmitted.toFixed(0)}kg`, color: "--warning" },
          { label: "CO₂ compensé", value: `${totalOffset.toFixed(0)}kg`, color: "--success" },
          { label: "Net", value: `${netCarbon > 0 ? "+" : ""}${netCarbon.toFixed(0)}kg`, color: netCarbon <= 0 ? "--success" : "--destructive" },
          { label: "Crédits", value: totalCredits, color: "--primary" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["dashboard", "credits", "certs"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "dashboard" ? "🌍 Dashboard" : v === "credits" ? "🌿 Crédits" : "🏅 Certifications"}
          </button>
        ))}
      </div>

      {view === "dashboard" && (
        <div className="space-y-2">
          {/* Net zero status */}
          <div className="rounded-xl p-4 text-center"
            style={{ background: netCarbon <= 0 ? "hsl(var(--success) / 0.08)" : "hsl(var(--warning) / 0.08)", border: `1px solid ${netCarbon <= 0 ? "hsl(var(--success) / 0.2)" : "hsl(var(--warning) / 0.2)"}` }}>
            <span className="text-2xl">{netCarbon <= 0 ? "🌍✅" : "⚠️"}</span>
            <p className="text-[11px] font-bold mt-1" style={{ color: netCarbon <= 0 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
              {netCarbon <= 0 ? "Carbon Négatif ! 🎉" : "Compensation insuffisante"}
            </p>
            <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              {Math.abs(netCarbon).toFixed(1)} kg CO₂ {netCarbon <= 0 ? "en surplus de compensation" : "restant à compenser"}
            </p>
          </div>

          {CARBON_DATA.map(c => (
            <div key={c.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <span className="text-lg">🚚</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.date} • {c.deliveries} livraisons</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  🔴 {c.co2Emitted}kg émis → 🟢 {c.co2Offset}kg compensé • {c.method}
                </p>
              </div>
              <span className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>+{c.credits} 🌿</span>
            </div>
          ))}
        </div>
      )}

      {view === "credits" && (
        <div className="space-y-2">
          {[
            { label: "Crédits totaux acquis", value: totalCredits, icon: "🌿", trend: 15 },
            { label: "Crédits utilisés", value: Math.round(totalCredits * 0.7), icon: "✅", trend: 8 },
            { label: "Crédits disponibles", value: Math.round(totalCredits * 0.3), icon: "💚", trend: 22 },
            { label: "Valeur estimée", value: `${(totalCredits * 12).toLocaleString()} F`, icon: "💰", trend: 10 },
            { label: "Arbres plantés équiv.", value: Math.round(totalCredits * 0.4), icon: "🌳", trend: 18 },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <span className="text-lg">{s.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.label}</p>
                <p className="text-[13px] font-bold" style={{ color: "hsl(var(--primary))" }}>{s.value}</p>
              </div>
              <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>↑ {s.trend}%</span>
            </div>
          ))}
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("Achat de crédits carbone initié"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--success))" }}>
            <TreePine className="h-3 w-3 mr-1" /> Acheter des crédits carbone
          </Button>
        </div>
      )}

      {view === "certs" && (
        <div className="space-y-2">
          {CERTS.map(c => {
            const lvl = levelCfg(c.level);
            return (
              <div key={c.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lvl.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.name}</p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🏢 {c.issuer} • 📅 Valide jusqu'au {c.validUntil}
                    </p>
                  </div>
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: c.status === "active" ? "hsl(var(--success) / 0.1)" : c.status === "pending" ? "hsl(var(--warning) / 0.1)" : "hsl(var(--muted) / 0.3)",
                      color: c.status === "active" ? "hsl(var(--success))" : c.status === "pending" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))",
                    }}>
                    {c.status === "active" ? "Actif" : c.status === "pending" ? "En cours" : "Expiré"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
