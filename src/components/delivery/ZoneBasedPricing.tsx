/**
 * ZoneBasedPricing — YY. Zone-Based Pricing
 * Dynamic tariffs per zone/city/region with visual zone editor.
 * PASS90-YY
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Edit3, Trash2, DollarSign, TrendingUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PricingZone {
  id: string;
  name: string;
  type: "city" | "district" | "region";
  baseFee: number;
  perKmRate: number;
  perKgRate: number;
  surgeMultiplier: number;
  peakHourSurcharge: number;
  minFee: number;
  maxFee: number;
  active: boolean;
  color: string;
}

const MOCK_ZONES: PricingZone[] = [
  { id: "z1", name: "Paris Centre", type: "district", baseFee: 4.5, perKmRate: 1.2, perKgRate: 0.5, surgeMultiplier: 1.0, peakHourSurcharge: 2.0, minFee: 5, maxFee: 50, active: true, color: "hsl(var(--hud-cyan))" },
  { id: "z2", name: "Paris Périphérique", type: "district", baseFee: 5.0, perKmRate: 1.0, perKgRate: 0.4, surgeMultiplier: 1.0, peakHourSurcharge: 1.5, minFee: 6, maxFee: 60, active: true, color: "hsl(var(--info))" },
  { id: "z3", name: "Île-de-France", type: "region", baseFee: 6.0, perKmRate: 0.8, perKgRate: 0.3, surgeMultiplier: 1.0, peakHourSurcharge: 1.0, minFee: 7, maxFee: 80, active: true, color: "hsl(var(--success))" },
  { id: "z4", name: "Lyon Métro", type: "city", baseFee: 4.0, perKmRate: 1.1, perKgRate: 0.45, surgeMultiplier: 1.0, peakHourSurcharge: 1.5, minFee: 5, maxFee: 45, active: true, color: "hsl(var(--warning))" },
  { id: "z5", name: "Marseille", type: "city", baseFee: 3.5, perKmRate: 0.9, perKgRate: 0.4, surgeMultiplier: 1.0, peakHourSurcharge: 1.0, minFee: 4, maxFee: 40, active: false, color: "hsl(var(--destructive))" },
];

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  city: { label: "Ville", emoji: "🏙️" },
  district: { label: "Quartier", emoji: "📍" },
  region: { label: "Région", emoji: "🗺️" },
};

export default function ZoneBasedPricing({ orgId }: { orgId: string }) {
  const [zones, setZones] = useState(MOCK_ZONES);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<PricingZone | null>(null);
  const [simDistance, setSimDistance] = useState(5);
  const [simWeight, setSimWeight] = useState(2);
  const [simPeak, setSimPeak] = useState(false);

  const simulatePrice = (zone: PricingZone) => {
    let price = zone.baseFee + (simDistance * zone.perKmRate) + (simWeight * zone.perKgRate);
    if (simPeak) price += zone.peakHourSurcharge;
    price *= zone.surgeMultiplier;
    return Math.min(Math.max(price, zone.minFee), zone.maxFee);
  };

  const toggleZone = (id: string) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, active: !z.active } : z));
    toast.success("Zone mise à jour");
  };

  const stats = useMemo(() => ({
    totalZones: zones.length,
    activeZones: zones.filter(z => z.active).length,
    avgBaseFee: zones.reduce((s, z) => s + z.baseFee, 0) / zones.length,
    avgPerKm: zones.reduce((s, z) => s + z.perKmRate, 0) / zones.length,
  }), [zones]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Tarification par Zones</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Zones", value: stats.totalZones, color: "--hud-cyan" },
          { label: "Actives", value: stats.activeZones, color: "--success" },
          { label: "Base moy.", value: `${stats.avgBaseFee.toFixed(1)}€`, color: "--warning" },
          { label: "€/km moy.", value: `${stats.avgPerKm.toFixed(2)}`, color: "--info" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-2 py-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Price simulator */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.06), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--hud-cyan) / 0.12)" }}>
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>🧮 Simulateur de prix</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[8px] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Distance (km)</label>
            <Input type="number" value={simDistance} onChange={e => setSimDistance(+e.target.value)} className="h-7 text-[10px] mt-0.5"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text))" }} />
          </div>
          <div>
            <label className="text-[8px] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Poids (kg)</label>
            <Input type="number" value={simWeight} onChange={e => setSimWeight(+e.target.value)} className="h-7 text-[10px] mt-0.5"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text))" }} />
          </div>
          <div>
            <label className="text-[8px] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Heure pointe</label>
            <button onClick={() => setSimPeak(!simPeak)} className="w-full h-7 mt-0.5 rounded-md text-[10px] font-semibold"
              style={{ background: simPeak ? "hsl(var(--warning) / 0.15)" : "hsl(var(--hud-bg))", color: simPeak ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.5)", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              {simPeak ? "🔥 Oui" : "Non"}
            </button>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          {zones.filter(z => z.active).map(z => (
            <div key={z.id} className="flex-1 text-center py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))", border: `1px solid ${z.color}30` }}>
              <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{z.name}</p>
              <p className="text-xs font-black" style={{ color: z.color }}>{simulatePrice(z).toFixed(2)}€</p>
            </div>
          ))}
        </div>
      </div>

      {/* Zones list */}
      <div className="space-y-2">
        {zones.map(z => {
          const typeCfg = TYPE_LABELS[z.type] || TYPE_LABELS.city;
          return (
            <div key={z.id} className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${z.active ? z.color + "20" : "hsl(var(--hud-border) / 0.06)"}`, opacity: z.active ? 1 : 0.6 }}>
              <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: z.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{typeCfg.emoji} {z.name}</p>
                  <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                    Base: {z.baseFee}€ • {z.perKmRate}€/km • {z.perKgRate}€/kg
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleZone(z.id); }}
                  className="w-8 h-4 rounded-full transition-all relative shrink-0"
                  style={{ background: z.active ? "hsl(var(--success))" : "hsl(var(--hud-bg))" }}>
                  <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all"
                    style={{ left: z.active ? "16px" : "2px", background: "white" }} />
                </button>
              </div>

              <AnimatePresence>
                {selectedZone === z.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Frais de base", value: `${z.baseFee}€` },
                          { label: "Par km", value: `${z.perKmRate}€` },
                          { label: "Par kg", value: `${z.perKgRate}€` },
                          { label: "Surge", value: `x${z.surgeMultiplier}` },
                          { label: "Surcharge pointe", value: `+${z.peakHourSurcharge}€` },
                          { label: "Min / Max", value: `${z.minFee}€ — ${z.maxFee}€` },
                        ].map(item => (
                          <div key={item.label} className="px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{item.label}</p>
                            <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="text-center py-2 rounded-lg" style={{ background: `${z.color}10` }}>
                        <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Prix simulé ({simDistance}km, {simWeight}kg)</p>
                        <p className="text-lg font-black" style={{ color: z.color }}>{simulatePrice(z).toFixed(2)}€</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
