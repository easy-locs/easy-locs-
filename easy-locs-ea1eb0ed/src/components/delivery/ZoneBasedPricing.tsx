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
import { useDeliveryPricingRules, useUpdateMutation } from "@/hooks/useDeliveryData";

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  city: { label: "Ville", emoji: "🏙️" },
  district: { label: "Quartier", emoji: "📍" },
  region: { label: "Région", emoji: "🗺️" },
};

export default function ZoneBasedPricing({ orgId }: { orgId: string }) {
  const { data: zones = [], isLoading } = useDeliveryPricingRules(orgId);
  const updateRule = useUpdateMutation("delivery_pricing_rules");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [simDistance, setSimDistance] = useState(5);
  const [simWeight, setSimWeight] = useState(2);
  const [simPeak, setSimPeak] = useState(false);

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const simulatePrice = (zone: any) => {
    const baseFee = zone.base_fee ?? zone.baseFee ?? 0;
    const perKmRate = zone.per_km_rate ?? zone.perKmRate ?? 0;
    const perKgRate = zone.per_kg_rate ?? zone.perKgRate ?? 0;
    const peakHourSurcharge = zone.peak_hour_surcharge ?? zone.peakHourSurcharge ?? 0;
    const surgeMultiplier = zone.surge_multiplier ?? zone.surgeMultiplier ?? 1;
    const minFee = zone.min_fee ?? zone.minFee ?? 0;
    const maxFee = zone.max_fee ?? zone.maxFee ?? 999;
    let price = baseFee + (simDistance * perKmRate) + (simWeight * perKgRate);
    if (simPeak) price += peakHourSurcharge;
    price *= surgeMultiplier;
    return Math.min(Math.max(price, minFee), maxFee);
  };

  const toggleZone = (id: string) => {
    const zone = zones.find((z: any) => z.id === id);
    if (!zone) return;
    const currentActive = zone.active ?? true;
    updateRule.mutate({ id, active: !currentActive } as any, {
      onSuccess: () => toast.success("Zone mise à jour"),
      onError: () => toast.error("Erreur lors de la mise à jour"),
    });
  };

  const activeZones = zones.filter((z: any) => z.active !== false);

  const stats = useMemo(() => ({
    totalZones: zones.length,
    activeZones: activeZones.length,
    avgBaseFee: zones.length > 0 ? zones.reduce((s: number, z: any) => s + (z.base_fee ?? z.baseFee ?? 0), 0) / zones.length : 0,
    avgPerKm: zones.length > 0 ? zones.reduce((s: number, z: any) => s + (z.per_km_rate ?? z.perKmRate ?? 0), 0) / zones.length : 0,
  }), [zones]);

  if (zones.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Tarification par Zones</h3>
        </div>
        <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucune zone de tarification</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Tarification par Zones</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Zones", value: stats.totalZones, color: "--hud-cyan" },
          { label: "Actives", value: stats.activeZones, color: "--success" },
          { label: "Base moy.", value: `${stats.avgBaseFee.toFixed(1)}€`, color: "--warning" },
          { label: "€/km moy.", value: `${stats.avgPerKm.toFixed(2)}`, color: "--info" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-2 py-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Price simulator */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.06), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--hud-cyan) / 0.12)" }}>
        <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>🧮 Simulateur de prix</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Distance (km)</label>
            <Input type="number" value={simDistance} onChange={e => setSimDistance(+e.target.value)} className="h-7 text-[0.625rem] mt-0.5"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text))" }} />
          </div>
          <div>
            <label className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Poids (kg)</label>
            <Input type="number" value={simWeight} onChange={e => setSimWeight(+e.target.value)} className="h-7 text-[0.625rem] mt-0.5"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text))" }} />
          </div>
          <div>
            <label className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Heure pointe</label>
            <button onClick={() => setSimPeak(!simPeak)} className="w-full h-7 mt-0.5 rounded-md text-[0.625rem] font-semibold"
              style={{ background: simPeak ? "hsl(var(--warning) / 0.15)" : "hsl(var(--hud-bg))", color: simPeak ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.5)", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              {simPeak ? "🔥 Oui" : "Non"}
            </button>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          {activeZones.map((z: any) => {
            const color = z.color || "hsl(var(--hud-cyan))";
            return (
              <div key={z.id} className="flex-1 text-center py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))", border: `1px solid color-mix(in srgb, ${color} 18%, transparent)` }}>
                <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{z.name}</p>
                <p className="text-xs font-extrabold tabular-nums" style={{ color }}>{simulatePrice(z).toFixed(2)}€</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zones list */}
      <div className="space-y-2">
        {zones.map((z: any) => {
          const typeCfg = TYPE_LABELS[z.type] || TYPE_LABELS.city;
          const isActive = z.active !== false;
          const color = z.color || "hsl(var(--hud-cyan))";
          const baseFee = z.base_fee ?? z.baseFee ?? 0;
          const perKmRate = z.per_km_rate ?? z.perKmRate ?? 0;
          const perKgRate = z.per_kg_rate ?? z.perKgRate ?? 0;
          const surgeMultiplier = z.surge_multiplier ?? z.surgeMultiplier ?? 1;
          const peakHourSurcharge = z.peak_hour_surcharge ?? z.peakHourSurcharge ?? 0;
          const minFee = z.min_fee ?? z.minFee ?? 0;
          const maxFee = z.max_fee ?? z.maxFee ?? 999;
          return (
            <div key={z.id} className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${isActive ? color + "20" : "hsl(var(--hud-border) / 0.06)"}`, opacity: isActive ? 1 : 0.6 }}>
              <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6875rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{typeCfg.emoji} {z.name}</p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                    Base: {baseFee}€ • {perKmRate}€/km • {perKgRate}€/kg
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleZone(z.id); }}
                  className="w-8 h-4 rounded-full transition-all relative shrink-0"
                  style={{ background: isActive ? "hsl(var(--success))" : "hsl(var(--hud-bg))" }}>
                  <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all"
                    style={{ left: isActive ? "16px" : "2px", background: "white" }} />
                </button>
              </div>

              <AnimatePresence>
                {selectedZone === z.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Frais de base", value: `${baseFee}€` },
                          { label: "Par km", value: `${perKmRate}€` },
                          { label: "Par kg", value: `${perKgRate}€` },
                          { label: "Surge", value: `x${surgeMultiplier}` },
                          { label: "Surcharge pointe", value: `+${peakHourSurcharge}€` },
                          { label: "Min / Max", value: `${minFee}€ — ${maxFee}€` },
                        ].map(item => (
                          <div key={item.label} className="px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                            <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{item.label}</p>
                            <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="text-center py-2 rounded-lg" style={{ background: `color-mix(in srgb, ${color} 6%, transparent)` }}>
                        <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Prix simulé ({simDistance}km, {simWeight}kg)</p>
                        <p className="text-lg font-extrabold tabular-nums" style={{ color }}>{simulatePrice(z).toFixed(2)}€</p>
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
