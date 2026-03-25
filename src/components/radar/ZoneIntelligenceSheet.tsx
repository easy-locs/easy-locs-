/**
 * ZoneIntelligenceSheet — Premium bottom sheet with snap points,
 * vertical tabs, top picks, and per-entity CTAs.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Utensils, Hotel, Sparkles, ShoppingBag, Car, Moon, Activity, Navigation, MessageCircle, Phone, Star } from "lucide-react";
import { computeVibeDensity } from "@/lib/engines/vibe-density-engine";
import { useNavigate } from "react-router-dom";

interface ZoneEntity {
  id: string;
  name: string;
  category?: string;
  type?: string;
  lat: number;
  lng: number;
  rating?: number;
  distance?: number;
  imageUrl?: string;
  image_url?: string;
}

interface Props {
  entities: ZoneEntity[];
  zoneLat: number;
  zoneLng: number;
  radiusKm: number;
  onClose: () => void;
  onSelectEntity?: (entity: ZoneEntity) => void;
}

type VerticalTab = "all" | "food" | "stay" | "services" | "utility" | "mobility" | "nightlife";

const TABS: { id: VerticalTab; label: string; icon: React.ReactNode; types: string[] }[] = [
  { id: "all", label: "All", icon: <MapPin className="w-3 h-3" />, types: [] },
  { id: "food", label: "Food", icon: <Utensils className="w-3 h-3" />, types: ["restaurant", "food", "cafe", "bakery", "fast_food", "grocery"] },
  { id: "stay", label: "Stay", icon: <Hotel className="w-3 h-3" />, types: ["hotel", "hostel", "resort", "property", "apartment"] },
  { id: "services", label: "Services", icon: <Sparkles className="w-3 h-3" />, types: ["service", "services", "healthcare", "salon", "spa"] },
  { id: "utility", label: "Utility", icon: <ShoppingBag className="w-3 h-3" />, types: ["shop", "shops", "atm", "bank", "pharmacy", "exchange"] },
  { id: "mobility", label: "Mobility", icon: <Car className="w-3 h-3" />, types: ["driver", "taxi", "bus", "metro", "mobility"] },
  { id: "nightlife", label: "Night", icon: <Moon className="w-3 h-3" />, types: ["bar", "club", "lounge", "nightclub"] },
];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ZoneIntelligenceSheet({ entities, zoneLat, zoneLng, radiusKm, onClose, onSelectEntity }: Props) {
  const [activeTab, setActiveTab] = useState<VerticalTab>("all");
  const [snap, setSnap] = useState<"half" | "full">("half");
  const navigate = useNavigate();

  const zoneEntities = useMemo(() => {
    return entities
      .map(e => ({ ...e, zoneDist: haversine(zoneLat, zoneLng, e.lat, e.lng) }))
      .filter(e => e.zoneDist <= radiusKm)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }, [entities, zoneLat, zoneLng, radiusKm]);

  const tabCounts = useMemo(() => {
    const c: Record<VerticalTab, number> = { all: zoneEntities.length, food: 0, stay: 0, services: 0, utility: 0, mobility: 0, nightlife: 0 };
    for (const e of zoneEntities) {
      const cat = (e.category || e.type || "").toLowerCase();
      for (const tab of TABS) {
        if (tab.id !== "all" && tab.types.some(t => cat.includes(t))) { c[tab.id]++; break; }
      }
    }
    return c;
  }, [zoneEntities]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return zoneEntities;
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab) return zoneEntities;
    return zoneEntities.filter(e => {
      const cat = (e.category || e.type || "").toLowerCase();
      return tab.types.some(t => cat.includes(t));
    });
  }, [zoneEntities, activeTab]);

  const vibe = useMemo(() => {
    if (!zoneEntities.length) return null;
    return computeVibeDensity("zone", zoneEntities.map(e => ({
      category: e.category || e.type || "service",
      rating: e.rating,
    })), new Date().getHours());
  }, [zoneEntities]);

  const heightClass = snap === "full" ? "max-h-[85dvh]" : "max-h-[55dvh]";

  if (zoneEntities.length === 0) {
    return (
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-border/15 px-4 py-8 text-center bg-card/97"
        initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center bg-muted/15">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No places in this zone</p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">Try increasing the radius or moving the map</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-border/15 flex flex-col ${heightClass}`}
      style={{ background: "hsl(var(--card)/0.97)", backdropFilter: "blur(16px)" }}
      initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
    >
      {/* Handle — tap to toggle snap */}
      <button onClick={() => setSnap(s => s === "half" ? "full" : "half")} className="flex items-center justify-center py-2 shrink-0 active:bg-muted/10">
        <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
      </button>

      {/* Header */}
      <div className="px-4 pb-2 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-foreground">Zone Intelligence</h3>
          <p className="text-[10px] text-muted-foreground">{zoneEntities.length} places • {radiusKm >= 1 ? `${radiusKm}km` : `${Math.round(radiusKm * 1000)}m`} radius</p>
        </div>
        <div className="flex items-center gap-2">
          {vibe && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "hsl(var(--accent)/0.1)", color: "hsl(var(--accent))" }}>
              <Activity className="w-2.5 h-2.5" />
              <span className="capitalize">{vibe.vibe}</span>
              <span className="opacity-60">•{vibe.crowdDensity}%</span>
            </div>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/15 active:scale-90 transition-transform">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(tab => {
            const count = tabCounts[tab.id];
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-semibold whitespace-nowrap border transition-all shrink-0 active:scale-95"
                style={{
                  background: active ? "hsl(var(--accent)/0.12)" : "hsl(var(--muted)/0.1)",
                  borderColor: active ? "hsl(var(--accent)/0.25)" : "transparent",
                  color: active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                }}
              >
                {tab.icon} {tab.label}
                {count > 0 && <span className="text-[8px] opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entity List */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
        {filtered.length > 0 && (
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1 pt-0.5 mb-1">
            Top Picks • {filtered.length}
          </p>
        )}
        {filtered.map((e, i) => {
          const isTop = i < 3;
          const distM = ((e as any).zoneDist * 1000);
          const distLabel = distM < 1000 ? `${Math.round(distM)}m` : `${((e as any).zoneDist).toFixed(1)}km`;

          return (
            <div
              key={e.id}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98]"
              style={{
                background: isTop ? "hsl(var(--accent)/0.04)" : "transparent",
                borderColor: isTop ? "hsl(var(--accent)/0.12)" : "hsl(var(--border)/0.08)",
              }}
            >
              {/* Rank badge */}
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0" style={{
                background: isTop ? "hsl(var(--accent)/0.12)" : "hsl(var(--muted)/0.12)",
                color: isTop ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
              }}>
                {i + 1}
              </div>

              {/* Image */}
              {(e.imageUrl || e.image_url) ? (
                <img src={e.imageUrl || e.image_url} alt={e.name} className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted/15 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0" onClick={() => onSelectEntity?.(e)}>
                <p className="text-[11px] font-bold text-foreground truncate">{e.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground capitalize truncate">{e.category || e.type}</span>
                  {e.rating && e.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px]">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {e.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Distance + CTA */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-bold text-muted-foreground">{distLabel}</span>
                <button
                  onClick={() => navigate(`/entity/${e.id}`)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: "hsl(var(--accent)/0.1)" }}
                >
                  <Navigation className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
