/**
 * DeliveryZonesManager — SSS. Zone-based delivery management with per-zone pricing,
 * geographic restrictions, and zone visualization.
 * PASS95-SSS
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Plus, Trash2, Edit3, DollarSign, Ruler,
  CheckCircle2, XCircle, Globe, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props {
  orgId: string;
  className?: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  color: string;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  baseFee: number;
  perKmFee: number;
  currency: string;
  maxWeight: number;
  active: boolean;
  restrictedHours?: string;
  vehicleTypes: string[];
}

const ZONE_COLORS = ["#22d3ee", "#a78bfa", "#f59e0b", "#ef4444", "#10b981", "#ec4899"];

const DEFAULT_ZONES: DeliveryZone[] = [
  { id: "z1", name: "Centre-ville", color: ZONE_COLORS[0], radiusKm: 5, centerLat: 48.8566, centerLng: 2.3522, baseFee: 3, perKmFee: 0.8, currency: "EUR", maxWeight: 30, active: true, vehicleTypes: ["bicycle", "scooter", "car"] },
  { id: "z2", name: "Périphérie", color: ZONE_COLORS[1], radiusKm: 15, centerLat: 48.8566, centerLng: 2.3522, baseFee: 5, perKmFee: 0.6, currency: "EUR", maxWeight: 50, active: true, vehicleTypes: ["car", "van"] },
  { id: "z3", name: "Banlieue", color: ZONE_COLORS[2], radiusKm: 30, centerLat: 48.8566, centerLng: 2.3522, baseFee: 8, perKmFee: 0.5, currency: "EUR", maxWeight: 100, active: false, restrictedHours: "22:00-06:00", vehicleTypes: ["car", "van"] },
];

export default function DeliveryZonesManager({ orgId, className }: Props) {
  const [zones, setZones] = useState<DeliveryZone[]>(DEFAULT_ZONES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newZone, setNewZone] = useState<Partial<DeliveryZone>>({
    name: "", radiusKm: 10, baseFee: 5, perKmFee: 0.5, maxWeight: 50,
    centerLat: 48.8566, centerLng: 2.3522, currency: "EUR",
    vehicleTypes: ["car"],
  });

  const toggleActive = (id: string) => {
    haptic("light");
    setZones(p => p.map(z => z.id === id ? { ...z, active: !z.active } : z));
    toast.success("Zone mise à jour");
  };

  const deleteZone = (id: string) => {
    haptic("warning");
    setZones(p => p.filter(z => z.id !== id));
    toast("Zone supprimée");
  };

  const createZone = () => {
    if (!newZone.name) { toast.error("Nom requis"); return; }
    haptic("success");
    const zone: DeliveryZone = {
      id: `z${Date.now()}`,
      name: newZone.name || "",
      color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
      radiusKm: newZone.radiusKm || 10,
      centerLat: newZone.centerLat || 48.8566,
      centerLng: newZone.centerLng || 2.3522,
      baseFee: newZone.baseFee || 5,
      perKmFee: newZone.perKmFee || 0.5,
      currency: newZone.currency || "EUR",
      maxWeight: newZone.maxWeight || 50,
      active: true,
      vehicleTypes: newZone.vehicleTypes || ["car"],
    };
    setZones(p => [...p, zone]);
    setShowCreate(false);
    setNewZone({ name: "", radiusKm: 10, baseFee: 5, perKmFee: 0.5, maxWeight: 50, centerLat: 48.8566, centerLng: 2.3522, currency: "EUR", vehicleTypes: ["car"] });
    toast.success("Zone créée !");
  };

  const estimateFee = (zone: DeliveryZone, distKm: number) => zone.baseFee + zone.perKmFee * Math.min(distKm, zone.radiusKm);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Zones de livraison</h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
            {zones.filter(z => z.active).length} actives
          </span>
        </div>
        <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => setShowCreate(!showCreate)}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Plus className="h-3 w-3 mr-1" /> Zone
        </Button>
      </div>

      {/* Zone map visualization (simplified) */}
      <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.1)", minHeight: 160 }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {zones.filter(z => z.active).map((z, i) => (
            <motion.div key={z.id}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute rounded-full"
              style={{
                width: `${Math.min(z.radiusKm * 8, 140)}px`,
                height: `${Math.min(z.radiusKm * 8, 140)}px`,
                background: `${z.color}15`,
                border: `2px dashed ${z.color}40`,
              }} />
          ))}
          <div className="w-3 h-3 rounded-full z-10" style={{ background: "hsl(var(--destructive))", boxShadow: "0 0 8px hsl(var(--destructive) / 0.5)" }} />
        </div>
        <div className="absolute bottom-2 left-2 flex gap-2">
          {zones.filter(z => z.active).map(z => (
            <span key={z.id} className="text-[7px] flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{ background: `${z.color}20`, color: z.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: z.color }} />
              {z.name}
            </span>
          ))}
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Nouvelle zone</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Nom *</Label>
                  <Input value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))}
                    className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <div>
                  <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Rayon (km)</Label>
                  <Input type="number" value={newZone.radiusKm} onChange={e => setNewZone(p => ({ ...p, radiusKm: +e.target.value }))}
                    className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <div>
                  <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Frais de base (€)</Label>
                  <Input type="number" step="0.5" value={newZone.baseFee} onChange={e => setNewZone(p => ({ ...p, baseFee: +e.target.value }))}
                    className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <div>
                  <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>€/km</Label>
                  <Input type="number" step="0.1" value={newZone.perKmFee} onChange={e => setNewZone(p => ({ ...p, perKmFee: +e.target.value }))}
                    className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-[10px] h-8" onClick={createZone}
                  style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>Créer</Button>
                <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => setShowCreate(false)}
                  style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>Annuler</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone list */}
      <div className="space-y-2">
        {zones.map(z => (
          <motion.div key={z.id} layout className="rounded-xl overflow-hidden"
            style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${z.active ? z.color + "20" : "hsl(var(--hud-border) / 0.06)"}` }}>
            <div className="flex items-center gap-3 p-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: z.color, opacity: z.active ? 1 : 0.3 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold" style={{ color: z.active ? "hsl(var(--hud-text))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
                    {z.name}
                  </p>
                  {!z.active && <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: "hsl(var(--hud-border) / 0.1)", color: "hsl(var(--hud-text-dim) / 0.3)" }}>Inactive</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[9px] flex items-center gap-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                    <Ruler className="h-2.5 w-2.5" /> {z.radiusKm} km
                  </span>
                  <span className="text-[9px] flex items-center gap-0.5" style={{ color: "hsl(var(--success))" }}>
                    <DollarSign className="h-2.5 w-2.5" /> {z.baseFee}€ + {z.perKmFee}€/km
                  </span>
                  <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                    Max {z.maxWeight}kg
                  </span>
                </div>
                {z.restrictedHours && (
                  <span className="text-[8px] mt-0.5 block" style={{ color: "hsl(var(--warning))" }}>
                    ⚠️ Restriction: {z.restrictedHours}
                  </span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleActive(z.id)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ background: z.active ? "hsl(var(--success) / 0.1)" : "hsl(var(--hud-border) / 0.06)" }}>
                  {z.active ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--success))" }} /> :
                    <XCircle className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />}
                </button>
                <button onClick={() => deleteZone(z.id)} className="p-1.5 rounded-lg" style={{ background: "hsl(var(--destructive) / 0.06)" }}>
                  <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--destructive) / 0.6)" }} />
                </button>
              </div>
            </div>

            {/* Fee estimator */}
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                Estimation : 
                {[3, 5, 10].map(km => (
                  <span key={km} className="px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--hud-bg))" }}>
                    {km}km → <b style={{ color: "hsl(var(--success))" }}>{estimateFee(z, km).toFixed(2)}€</b>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
