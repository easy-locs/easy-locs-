/**
 * CrossBorderLogistics — WWW. Cross-Border Logistics.
 * Customs, export docs, multi-country taxes, international tracking, logistics partners.
 * PASS102-WWW
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe, FileText, Plane, Package, Shield,
  MapPin, Clock, CheckCircle2, AlertTriangle, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Shipment {
  id: string;
  origin: string;
  destination: string;
  status: "customs" | "in_transit" | "cleared" | "delivered" | "held";
  trackingCode: string;
  partner: string;
  value: number;
  currency: string;
  customsDuty: number;
  documents: string[];
  eta: Date;
}

const SHIPMENTS: Shipment[] = [
  { id: "s1", origin: "🇸🇳 Dakar", destination: "🇨🇮 Abidjan", status: "in_transit", trackingCode: "CB-2026-0847", partner: "DHL Express", value: 2500000, currency: "XOF", customsDuty: 375000, documents: ["Facture", "Certificat origine", "Douane"], eta: new Date(Date.now() + 172800000) },
  { id: "s2", origin: "🇸🇳 Dakar", destination: "🇲🇦 Casablanca", status: "customs", trackingCode: "CB-2026-0843", partner: "FedEx", value: 1800000, currency: "XOF", customsDuty: 270000, documents: ["Facture", "Phytosanitaire"], eta: new Date(Date.now() + 259200000) },
  { id: "s3", origin: "🇫🇷 Paris", destination: "🇸🇳 Dakar", status: "cleared", trackingCode: "CB-2026-0839", partner: "UPS", value: 4200000, currency: "XOF", customsDuty: 840000, documents: ["Facture", "Douane", "Assurance"], eta: new Date(Date.now() + 86400000) },
  { id: "s4", origin: "🇸🇳 Dakar", destination: "🇬🇦 Libreville", status: "held", trackingCode: "CB-2026-0835", partner: "Chronopost", value: 950000, currency: "XOF", customsDuty: 142500, documents: ["Facture"], eta: new Date(Date.now() + 432000000) },
  { id: "s5", origin: "🇨🇳 Shanghai", destination: "🇸🇳 Dakar", status: "delivered", trackingCode: "CB-2026-0828", partner: "Maersk", value: 12000000, currency: "XOF", customsDuty: 2400000, documents: ["Facture", "Douane", "Bill of Lading", "Certificat"], eta: new Date(Date.now() - 86400000) },
];

const PARTNERS = [
  { name: "DHL Express", routes: 12, reliability: 94, avgDays: 3.5 },
  { name: "FedEx", routes: 8, reliability: 91, avgDays: 4.2 },
  { name: "UPS", routes: 6, reliability: 89, avgDays: 5.0 },
  { name: "Maersk", routes: 4, reliability: 96, avgDays: 18 },
];

export default function CrossBorderLogistics({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"shipments" | "customs" | "partners">("shipments");

  const inTransit = SHIPMENTS.filter(s => ["in_transit", "customs"].includes(s.status)).length;
  const totalValue = SHIPMENTS.reduce((s, sh) => s + sh.value, 0);
  const totalDuties = SHIPMENTS.reduce((s, sh) => s + sh.customsDuty, 0);
  const heldCount = SHIPMENTS.filter(s => s.status === "held").length;
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}k`;

  const statusCfg = (s: string) => ({
    customs: { label: "Douane", color: "--warning", icon: "🏛️" },
    in_transit: { label: "En transit", color: "--info", icon: "✈️" },
    cleared: { label: "Dédouané", color: "--success", icon: "✅" },
    delivered: { label: "Livré", color: "--success", icon: "📦" },
    held: { label: "Bloqué", color: "--destructive", icon: "⛔" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Globe className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
        Logistique internationale
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "En transit", value: inTransit, color: "--info" },
          { label: "Valeur", value: fmt(totalValue), color: "--primary" },
          { label: "Douanes", value: fmt(totalDuties), color: "--warning" },
          { label: "Bloqués", value: heldCount, color: heldCount > 0 ? "--destructive" : "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["shipments", "customs", "partners"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "shipments" ? "📦 Envois" : v === "customs" ? "🏛️ Douanes" : "🤝 Partenaires"}
          </button>
        ))}
      </div>

      {view === "shipments" && (
        <div className="space-y-2">
          {SHIPMENTS.map(s => {
            const cfg = statusCfg(s.status);
            return (
              <div key={s.id} className="rounded-xl p-3"
                style={{ background: s.status === "held" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${s.status === "held" ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--border) / 0.08)"}` }}>
                <div className="flex items-start gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      {s.origin} → {s.destination}
                    </p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🔖 {s.trackingCode} • 🚚 {s.partner}
                    </p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📄 {s.documents.join(", ")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    <p className="text-[9px] font-bold mt-1" style={{ color: "hsl(var(--primary))" }}>{fmt(s.value)} F</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "customs" && (
        <div className="space-y-2">
          {SHIPMENTS.filter(s => s.customsDuty > 0).map(s => (
            <div key={s.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <Shield className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.origin} → {s.destination}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Valeur: {fmt(s.value)} F • Taux: {Math.round(s.customsDuty / s.value * 100)}%
                </p>
              </div>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--warning))" }}>{s.customsDuty.toLocaleString()} F</p>
            </div>
          ))}
        </div>
      )}

      {view === "partners" && (
        <div className="space-y-2">
          {PARTNERS.map(p => (
            <div key={p.name} className="rounded-xl p-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{p.name}</p>
                <span className="text-[9px] font-bold" style={{ color: p.reliability >= 93 ? "hsl(var(--success))" : "hsl(var(--warning))" }}>{p.reliability}%</span>
              </div>
              <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                {p.routes} routes • ~{p.avgDays}j délai moyen
              </p>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${p.reliability}%` }}
                  className="h-full rounded-full" style={{ background: p.reliability >= 93 ? "hsl(var(--success))" : "hsl(var(--warning))" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
