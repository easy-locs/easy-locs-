/**
 * CrowdDeliveryNetwork — FFF2. Crowd Delivery Network.
 * Community matching, micro-deliveries, collaborative economy, social scoring.
 * PASS104-FFF2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, MapPin, Star, Package, TrendingUp,
  Clock, Shield, Heart, Zap, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface CrowdCourier {
  id: string;
  name: string;
  avatar: string;
  socialScore: number;
  completedDeliveries: number;
  rating: number;
  zone: string;
  available: boolean;
  vehicle: string;
  earnings: number;
  badges: string[];
  joinedAt: Date;
}

interface MicroDelivery {
  id: string;
  description: string;
  origin: string;
  destination: string;
  distance: number;
  reward: number;
  currency: string;
  weight: number;
  status: "open" | "claimed" | "in_progress" | "delivered" | "expired";
  postedAt: Date;
  claimedBy: string | null;
  urgency: "low" | "medium" | "high";
}

interface CommunityStats {
  label: string;
  value: string | number;
  trend: number;
  icon: string;
}

const COURIERS: CrowdCourier[] = [
  { id: "cc1", name: "Aminata D.", avatar: "👩🏾", socialScore: 94, completedDeliveries: 127, rating: 4.9, zone: "Médina", available: true, vehicle: "🚶 À pied", earnings: 245000, badges: ["⭐", "🏆", "💎"], joinedAt: new Date(Date.now() - 15552000000) },
  { id: "cc2", name: "Moussa K.", avatar: "👨🏾", socialScore: 88, completedDeliveries: 89, rating: 4.7, zone: "Plateau", available: true, vehicle: "🚲 Vélo", earnings: 178000, badges: ["⭐", "🛡️"], joinedAt: new Date(Date.now() - 10368000000) },
  { id: "cc3", name: "Ndèye F.", avatar: "👩🏾", socialScore: 82, completedDeliveries: 45, rating: 4.6, zone: "Parcelles", available: false, vehicle: "🚶 À pied", earnings: 92000, badges: ["⭐"], joinedAt: new Date(Date.now() - 5184000000) },
  { id: "cc4", name: "Cheikh B.", avatar: "👨🏾", socialScore: 76, completedDeliveries: 23, rating: 4.4, zone: "Guédiawaye", available: true, vehicle: "🛵 Scooter", earnings: 56000, badges: [], joinedAt: new Date(Date.now() - 2592000000) },
  { id: "cc5", name: "Sokhna S.", avatar: "👩🏾", socialScore: 91, completedDeliveries: 112, rating: 4.8, zone: "Dakar Centre", available: true, vehicle: "🚲 Vélo", earnings: 215000, badges: ["⭐", "🏆"], joinedAt: new Date(Date.now() - 12960000000) },
];

const DELIVERIES: MicroDelivery[] = [
  { id: "md1", description: "Enveloppe documents", origin: "Bureau Plateau", destination: "Notaire Médina", distance: 1.2, reward: 1500, currency: "XOF", weight: 0.3, status: "open", postedAt: new Date(Date.now() - 1800000), claimedBy: null, urgency: "high" },
  { id: "md2", description: "Petit colis e-commerce", origin: "Shop Sandaga", destination: "Client Parcelles", distance: 3.5, reward: 2500, currency: "XOF", weight: 1.8, status: "claimed", postedAt: new Date(Date.now() - 3600000), claimedBy: "Moussa K.", urgency: "medium" },
  { id: "md3", description: "Repas restaurant", origin: "Restaurant Almadies", destination: "Bureau Plateau", distance: 4.1, reward: 3000, currency: "XOF", weight: 2.5, status: "in_progress", postedAt: new Date(Date.now() - 5400000), claimedBy: "Aminata D.", urgency: "high" },
  { id: "md4", description: "Clés appartement", origin: "Agence Fann", destination: "Locataire Mermoz", distance: 2.0, reward: 2000, currency: "XOF", weight: 0.1, status: "delivered", postedAt: new Date(Date.now() - 14400000), claimedBy: "Sokhna S.", urgency: "low" },
  { id: "md5", description: "Médicaments pharmacie", origin: "Pharmacie Liberté", destination: "Patient HLM", distance: 1.8, reward: 2000, currency: "XOF", weight: 0.5, status: "open", postedAt: new Date(Date.now() - 900000), claimedBy: null, urgency: "high" },
];

export default function CrowdDeliveryNetwork({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"couriers" | "deliveries" | "community">("deliveries");

  const activeCouriers = COURIERS.filter(c => c.available).length;
  const openDeliveries = DELIVERIES.filter(d => d.status === "open").length;
  const totalDelivered = COURIERS.reduce((s, c) => s + c.completedDeliveries, 0);
  const avgScore = Math.round(COURIERS.reduce((s, c) => s + c.socialScore, 0) / COURIERS.length);
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}k`;

  const statusCfg = (s: string) => ({
    open: { label: "Ouvert", color: "--success", icon: "🟢" },
    claimed: { label: "Pris", color: "--info", icon: "🤝" },
    in_progress: { label: "En cours", color: "--warning", icon: "🚶" },
    delivered: { label: "Livré", color: "--success", icon: "✅" },
    expired: { label: "Expiré", color: "--muted-foreground", icon: "⏰" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  const urgencyCfg = (u: string) => ({
    low: { label: "Normal", color: "--success" },
    medium: { label: "Moyen", color: "--warning" },
    high: { label: "Urgent", color: "--destructive" },
  }[u] || { label: u, color: "--muted-foreground" });

  const COMMUNITY_STATS: CommunityStats[] = [
    { label: "Livreurs communautaires", value: COURIERS.length, trend: 12, icon: "👥" },
    { label: "Livraisons ce mois", value: totalDelivered, trend: 8, icon: "📦" },
    { label: "Revenus distribués", value: `${fmt(COURIERS.reduce((s, c) => s + c.earnings, 0))} F`, trend: 15, icon: "💰" },
    { label: "Score social moyen", value: `${avgScore}/100`, trend: 3, icon: "⭐" },
    { label: "Taux de satisfaction", value: "96%", trend: 2, icon: "❤️" },
    { label: "CO₂ évité", value: "124 kg", trend: 18, icon: "🌱" },
  ];

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Users className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Réseau de livraison collaborative
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Livreurs dispo", value: activeCouriers, color: "--success" },
          { label: "Missions ouvertes", value: openDeliveries, color: openDeliveries > 0 ? "--warning" : "--success" },
          { label: "Total livré", value: totalDelivered, color: "--primary" },
          { label: "Score moyen", value: avgScore, color: "--info" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["deliveries", "couriers", "community"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "deliveries" ? "📦 Missions" : v === "couriers" ? "👥 Livreurs" : "🌍 Communauté"}
          </button>
        ))}
      </div>

      {view === "deliveries" && (
        <div className="space-y-2">
          {DELIVERIES.map(d => {
            const cfg = statusCfg(d.status);
            const urg = urgencyCfg(d.urgency);
            return (
              <div key={d.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{d.description}</p>
                      <span className="text-[6px] font-bold px-1 py-0.5 rounded"
                        style={{ background: `hsl(var(${urg.color}) / 0.1)`, color: `hsl(var(${urg.color}))` }}>{urg.label}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📍 {d.origin} → {d.destination} • 📏 {d.distance}km • ⚖️ {d.weight}kg
                    </p>
                    {d.claimedBy && <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--info))" }}>👤 {d.claimedBy}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold" style={{ color: "hsl(var(--success))" }}>{d.reward.toLocaleString()} F</p>
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("Micro-livraison publiée"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--primary))" }}>
            <Package className="h-3 w-3 mr-1" /> Publier une micro-livraison
          </Button>
        </div>
      )}

      {view === "couriers" && (
        <div className="space-y-2">
          {COURIERS.map(c => (
            <div key={c.id} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ background: c.available ? "hsl(var(--success) / 0.1)" : "hsl(var(--muted) / 0.5)" }}>
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.name}</p>
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: c.available ? "hsl(var(--success) / 0.1)" : "hsl(var(--muted) / 0.3)", color: c.available ? "hsl(var(--success))" : "hsl(var(--muted-foreground))" }}>
                      {c.available ? "Dispo" : "Occupé"}
                    </span>
                  </div>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {c.vehicle} • 📍 {c.zone} • 📦 {c.completedDeliveries} livraisons • ⭐ {c.rating}
                  </p>
                  {c.badges.length > 0 && <p className="text-[8px]">{c.badges.join(" ")}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold" style={{ color: c.socialScore >= 90 ? "hsl(var(--success))" : c.socialScore >= 80 ? "hsl(var(--primary))" : "hsl(var(--warning))" }}>
                    {c.socialScore}
                  </p>
                  <p className="text-[6px]" style={{ color: "hsl(var(--muted-foreground))" }}>score</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "community" && (
        <div className="space-y-2">
          {COMMUNITY_STATS.map(s => (
            <div key={s.label} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <span className="text-lg">{s.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.label}</p>
                <p className="text-[13px] font-bold" style={{ color: "hsl(var(--primary))" }}>{s.value}</p>
              </div>
              <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>
                ↑ {s.trend}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
