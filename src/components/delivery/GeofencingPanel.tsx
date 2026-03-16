/**
 * GeofencingPanel — Geofencing with delivery zone restrictions and alerts.
 * PASS82-T: Geofencing & Zones
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Plus, Trash2, Shield, AlertTriangle, Loader2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface GeoZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
  type: "allowed" | "restricted" | "premium";
  active: boolean;
}

interface Props {
  className?: string;
}

export default function GeofencingPanel({ className }: Props) {
  const { user } = useAuth();
  const [zones, setZones] = useState<GeoZone[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newZone, setNewZone] = useState<{ name: string; lat: number; lng: number; radius_km: number; type: "allowed" | "restricted" | "premium" }>({ name: "", lat: 48.8566, lng: 2.3522, radius_km: 10, type: "allowed" });
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);

  // Get driver position
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false }
    );
  }, []);

  // Load zones from localStorage (simple persistence)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`easylocs_geozones_${user?.id}`);
      if (saved) setZones(JSON.parse(saved));
    } catch {}
  }, [user?.id]);

  const saveZones = useCallback((updated: GeoZone[]) => {
    setZones(updated);
    try {
      localStorage.setItem(`easylocs_geozones_${user?.id}`, JSON.stringify(updated));
    } catch {}
  }, [user?.id]);

  const addZone = () => {
    if (!newZone.name.trim()) { toast.error("Nom requis"); return; }
    const zone: GeoZone = {
      id: crypto.randomUUID(),
      ...newZone,
      active: true,
    };
    saveZones([...zones, zone]);
    setNewZone({ name: "", lat: 48.8566, lng: 2.3522, radius_km: 10, type: "allowed" });
    setShowAdd(false);
    toast.success("Zone ajoutée");
  };

  const removeZone = (id: string) => {
    saveZones(zones.filter(z => z.id !== id));
    toast("Zone supprimée");
  };

  const toggleZone = (id: string) => {
    saveZones(zones.map(z => z.id === id ? { ...z, active: !z.active } : z));
  };

  // Calculate distance between two points (Haversine)
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const isInZone = (zone: GeoZone) => {
    if (!driverPos) return null;
    const dist = haversineKm(driverPos.lat, driverPos.lng, zone.lat, zone.lng);
    return dist <= zone.radius_km;
  };

  const ZONE_COLORS: Record<string, string> = {
    allowed: "var(--success)",
    restricted: "var(--destructive)",
    premium: "var(--warning)",
  };

  const ZONE_LABELS: Record<string, string> = {
    allowed: "Autorisée",
    restricted: "Restreinte",
    premium: "Premium",
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Shield className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Zones de livraison
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="text-[10px] h-7">
          <Plus className="h-3 w-3 mr-1" /> Zone
        </Button>
      </div>

      {/* Driver position */}
      {driverPos && (
        <div className="rounded-lg px-3 py-2 flex items-center gap-2"
          style={{ background: "hsl(var(--hud-cyan) / 0.06)", border: "1px solid hsl(var(--hud-cyan) / 0.1)" }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--success))" }} />
          <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Position: {driverPos.lat.toFixed(4)}, {driverPos.lng.toFixed(4)}
          </span>
        </div>
      )}

      {/* Add zone form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl p-3 space-y-2"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)" }}>
          <Label className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Nom de zone</Label>
          <Input value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Centre-ville" className="h-7 text-[11px]" style={{ background: "hsl(var(--hud-border) / 0.04)" }} />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Lat</Label>
              <Input type="number" value={newZone.lat} step={0.001}
                onChange={e => setNewZone(p => ({ ...p, lat: Number(e.target.value) }))}
                className="h-6 text-[10px]" style={{ background: "hsl(var(--hud-border) / 0.04)" }} />
            </div>
            <div>
              <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Lng</Label>
              <Input type="number" value={newZone.lng} step={0.001}
                onChange={e => setNewZone(p => ({ ...p, lng: Number(e.target.value) }))}
                className="h-6 text-[10px]" style={{ background: "hsl(var(--hud-border) / 0.04)" }} />
            </div>
            <div>
              <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Rayon km</Label>
              <Input type="number" value={newZone.radius_km} min={1} max={100}
                onChange={e => setNewZone(p => ({ ...p, radius_km: Number(e.target.value) }))}
                className="h-6 text-[10px]" style={{ background: "hsl(var(--hud-border) / 0.04)" }} />
            </div>
          </div>
          <div className="flex gap-1">
            {(["allowed", "restricted", "premium"] as const).map(t => (
              <button key={t} onClick={() => setNewZone(p => ({ ...p, type: t }))}
                className="text-[9px] px-2 py-1 rounded-full font-medium"
                style={{
                  background: newZone.type === t ? `hsl(${ZONE_COLORS[t]} / 0.15)` : "hsl(var(--hud-border) / 0.06)",
                  color: newZone.type === t ? `hsl(${ZONE_COLORS[t]})` : "hsl(var(--hud-text-dim) / 0.4)",
                }}>
                {ZONE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="text-[10px] h-7 flex-1">Annuler</Button>
            <Button size="sm" onClick={addZone} className="text-[10px] h-7 flex-1"
              style={{ background: "hsl(var(--hud-cyan))", color: "#fff" }}>Ajouter</Button>
          </div>
        </motion.div>
      )}

      {/* Zones list */}
      <div className="space-y-1.5">
        {zones.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-6 w-6 mx-auto mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Aucune zone configurée</p>
          </div>
        ) : zones.map(zone => {
          const inside = isInZone(zone);
          const colorVar = ZONE_COLORS[zone.type];
          return (
            <motion.div key={zone.id} layout
              className="rounded-lg px-3 py-2.5 flex items-center gap-2"
              style={{
                background: "hsl(var(--hud-surface))",
                border: `1px solid hsl(${colorVar} / ${zone.active ? 0.15 : 0.05})`,
                opacity: zone.active ? 1 : 0.5,
              }}>
              <div className="w-3 h-3 rounded-full shrink-0"
                style={{ background: `hsl(${colorVar} / 0.3)`, border: `2px solid hsl(${colorVar})` }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{zone.name}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {ZONE_LABELS[zone.type]} • {zone.radius_km} km
                  {inside !== null && (
                    <span style={{ color: inside ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                      {inside ? " • ✓ Dans zone" : " • ✗ Hors zone"}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => toggleZone(zone.id)} className="text-[9px] px-2 py-0.5 rounded"
                style={{ background: zone.active ? "hsl(var(--success) / 0.1)" : "hsl(var(--hud-border) / 0.1)", color: zone.active ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
                {zone.active ? "ON" : "OFF"}
              </button>
              <button onClick={() => removeZone(zone.id)} style={{ color: "hsl(var(--destructive) / 0.4)" }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Zone alerts summary */}
      {driverPos && zones.filter(z => z.active).length > 0 && (
        <div className="rounded-xl p-3"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <p className="text-[10px] font-semibold mb-1.5" style={{ color: "hsl(var(--hud-text-dim))" }}>
            <AlertTriangle className="h-3 w-3 inline mr-1" /> Alertes de zone
          </p>
          {zones.filter(z => z.active && z.type === "restricted" && isInZone(z)).map(z => (
            <p key={z.id} className="text-[9px] py-0.5" style={{ color: "hsl(var(--destructive))" }}>
              ⚠️ Vous êtes dans la zone restreinte "{z.name}"
            </p>
          ))}
          {zones.filter(z => z.active && z.type === "allowed" && !isInZone(z)).map(z => (
            <p key={z.id} className="text-[9px] py-0.5" style={{ color: "hsl(var(--warning))" }}>
              📍 Vous êtes hors de la zone autorisée "{z.name}"
            </p>
          ))}
          {zones.filter(z => z.active).every(z => {
            const inside = isInZone(z);
            return (z.type === "allowed" && inside) || (z.type === "restricted" && !inside) || z.type === "premium";
          }) && (
            <p className="text-[9px]" style={{ color: "hsl(var(--success))" }}>✅ Toutes les zones OK</p>
          )}
        </div>
      )}
    </div>
  );
}
