/**
 * DeliveryMarketplace — JJJ2. Delivery Marketplace.
 * Reverse auctions, provider comparison, guaranteed SLAs, quality scoring.
 * PASS105-JJJ2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, Star, Shield, Clock, TrendingUp,
  Gavel, CheckCircle2, ArrowDownUp, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface DeliveryProvider {
  id: string;
  name: string;
  logo: string;
  rating: number;
  reviews: number;
  deliveries: number;
  avgDeliveryTime: number;
  slaGuarantee: number;
  priceRange: { min: number; max: number };
  currency: string;
  specialties: string[];
  verified: boolean;
  responseTime: number;
}

interface ReverseAuction {
  id: string;
  description: string;
  origin: string;
  destination: string;
  weight: number;
  deadline: Date;
  bids: AuctionBid[];
  status: "open" | "closed" | "awarded" | "expired";
  minBid: number;
  currency: string;
}

interface AuctionBid {
  providerId: string;
  providerName: string;
  amount: number;
  eta: number;
  slaGuarantee: number;
  score: number;
}

const PROVIDERS: DeliveryProvider[] = [
  { id: "dp1", name: "RapidExpress", logo: "🚀", rating: 4.8, reviews: 342, deliveries: 1250, avgDeliveryTime: 45, slaGuarantee: 98, priceRange: { min: 1500, max: 8000 }, currency: "XOF", specialties: ["Express", "Fragile"], verified: true, responseTime: 3 },
  { id: "dp2", name: "EcoLogistics", logo: "🌿", rating: 4.6, reviews: 218, deliveries: 890, avgDeliveryTime: 90, slaGuarantee: 95, priceRange: { min: 800, max: 5000 }, currency: "XOF", specialties: ["Éco", "Gros volumes"], verified: true, responseTime: 8 },
  { id: "dp3", name: "CityFlash", logo: "⚡", rating: 4.9, reviews: 567, deliveries: 2100, avgDeliveryTime: 25, slaGuarantee: 99, priceRange: { min: 2000, max: 12000 }, currency: "XOF", specialties: ["Ultra-rapide", "Dernière minute"], verified: true, responseTime: 1 },
  { id: "dp4", name: "SafeDelivery", logo: "🛡️", rating: 4.7, reviews: 156, deliveries: 650, avgDeliveryTime: 60, slaGuarantee: 97, priceRange: { min: 2500, max: 15000 }, currency: "XOF", specialties: ["Haute valeur", "Assuré"], verified: true, responseTime: 5 },
  { id: "dp5", name: "MotoKurse", logo: "🏍️", rating: 4.4, reviews: 89, deliveries: 420, avgDeliveryTime: 35, slaGuarantee: 92, priceRange: { min: 1000, max: 4000 }, currency: "XOF", specialties: ["Moto", "Centre-ville"], verified: false, responseTime: 2 },
];

const AUCTIONS: ReverseAuction[] = [
  {
    id: "ra1", description: "Colis fragile 5kg", origin: "Plateau", destination: "Almadies", weight: 5,
    deadline: new Date(Date.now() + 3600000), status: "open", minBid: 3000, currency: "XOF",
    bids: [
      { providerId: "dp1", providerName: "RapidExpress", amount: 3500, eta: 40, slaGuarantee: 98, score: 92 },
      { providerId: "dp3", providerName: "CityFlash", amount: 4200, eta: 20, slaGuarantee: 99, score: 95 },
      { providerId: "dp5", providerName: "MotoKurse", amount: 2800, eta: 30, slaGuarantee: 90, score: 78 },
    ],
  },
  {
    id: "ra2", description: "Documents urgents", origin: "Médina", destination: "Fann", weight: 0.5,
    deadline: new Date(Date.now() + 1800000), status: "open", minBid: 1500, currency: "XOF",
    bids: [
      { providerId: "dp3", providerName: "CityFlash", amount: 2000, eta: 15, slaGuarantee: 99, score: 97 },
      { providerId: "dp1", providerName: "RapidExpress", amount: 1800, eta: 25, slaGuarantee: 98, score: 90 },
    ],
  },
  {
    id: "ra3", description: "Lot e-commerce 15 colis", origin: "Sandaga", destination: "Multi-destinations", weight: 45,
    deadline: new Date(Date.now() + 7200000), status: "open", minBid: 25000, currency: "XOF",
    bids: [
      { providerId: "dp2", providerName: "EcoLogistics", amount: 28000, eta: 180, slaGuarantee: 95, score: 88 },
    ],
  },
];

export default function DeliveryMarketplace({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"providers" | "auctions" | "compare">("providers");

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <ShoppingBag className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Place de marché livraison
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Prestataires", value: PROVIDERS.length, color: "--primary" },
          { label: "Enchères", value: AUCTIONS.filter(a => a.status === "open").length, color: "--warning" },
          { label: "Offres reçues", value: AUCTIONS.reduce((s, a) => s + a.bids.length, 0), color: "--info" },
          { label: "Vérifiés", value: PROVIDERS.filter(p => p.verified).length, color: "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["providers", "auctions", "compare"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "providers" ? "🏪 Prestataires" : v === "auctions" ? "🔨 Enchères" : "⚖️ Comparer"}
          </button>
        ))}
      </div>

      {view === "providers" && (
        <div className="space-y-2">
          {PROVIDERS.map(p => (
            <div key={p.id} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ background: "hsl(var(--primary) / 0.08)" }}>{p.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{p.name}</p>
                    {p.verified && <CheckCircle2 className="h-3 w-3" style={{ color: "hsl(var(--success))" }} />}
                  </div>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    ⭐ {p.rating} ({p.reviews}) • ⏱️ ~{p.avgDeliveryTime}min • 🛡️ SLA {p.slaGuarantee}%
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    {p.specialties.map(s => (
                      <span key={s} className="text-[6px] px-1 py-0.5 rounded" style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>
                    {fmt(p.priceRange.min)}-{fmt(p.priceRange.max)} F
                  </p>
                  <p className="text-[6px]" style={{ color: "hsl(var(--muted-foreground))" }}>Réponse ~{p.responseTime}min</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "auctions" && (
        <div className="space-y-2">
          {AUCTIONS.map(a => (
            <div key={a.id} className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{a.description}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    📍 {a.origin} → {a.destination} • ⚖️ {a.weight}kg
                  </p>
                </div>
                <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>
                  ⏰ {Math.round((a.deadline.getTime() - Date.now()) / 60000)}min
                </span>
              </div>
              <div className="space-y-1">
                {a.bids.sort((x, y) => y.score - x.score).map((b, i) => (
                  <div key={b.providerId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{ background: i === 0 ? "hsl(var(--success) / 0.05)" : "transparent" }}>
                    {i === 0 && <span className="text-[8px]">🏆</span>}
                    <p className="flex-1 text-[9px] font-medium" style={{ color: "hsl(var(--foreground))" }}>{b.providerName}</p>
                    <span className="text-[8px] font-bold" style={{ color: "hsl(var(--success))" }}>{b.amount.toLocaleString()} F</span>
                    <span className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>~{b.eta}min</span>
                    <span className="text-[7px] font-bold" style={{ color: "hsl(var(--primary))" }}>{b.score}/100</span>
                  </div>
                ))}
              </div>
              {a.bids.length > 0 && (
                <Button size="sm" className="w-full text-[9px] h-7" variant="outline"
                  onClick={() => { haptic("medium"); toast.success(`Enchère attribuée à ${a.bids.sort((x, y) => y.score - x.score)[0].providerName}`); }}
                  style={{ borderColor: "hsl(var(--success) / 0.3)", color: "hsl(var(--success))" }}>
                  <Award className="h-2.5 w-2.5 mr-1" /> Attribuer au meilleur
                </Button>
              )}
            </div>
          ))}
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("Nouvelle enchère inversée créée"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--primary))" }}>
            <Gavel className="h-3 w-3 mr-1" /> Créer une enchère inversée
          </Button>
        </div>
      )}

      {view === "compare" && (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border) / 0.08)" }}>
            <div className="grid grid-cols-5 gap-0 text-[7px] font-bold p-2" style={{ background: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}>
              <span>Prestataire</span><span>Note</span><span>Délai</span><span>SLA</span><span>Prix min</span>
            </div>
            {PROVIDERS.sort((a, b) => b.rating - a.rating).map(p => (
              <div key={p.id} className="grid grid-cols-5 gap-0 text-[8px] p-2 items-center" style={{ borderTop: "1px solid hsl(var(--border) / 0.05)" }}>
                <span className="font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{p.logo} {p.name}</span>
                <span style={{ color: "hsl(var(--warning))" }}>⭐ {p.rating}</span>
                <span style={{ color: "hsl(var(--info))" }}>{p.avgDeliveryTime}min</span>
                <span style={{ color: p.slaGuarantee >= 97 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>{p.slaGuarantee}%</span>
                <span style={{ color: "hsl(var(--success))" }}>{fmt(p.priceRange.min)} F</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
