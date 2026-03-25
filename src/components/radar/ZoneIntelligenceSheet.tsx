/**
 * ZoneIntelligenceSheet — Bottom sheet showing all entities in a clicked zone,
 * grouped by vertical with vibe/heat scoring.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Utensils, Hotel, Sparkles, ShoppingBag, Car, Moon, Activity, Flame } from "lucide-react";
import { computeVibeDensity } from "@/lib/engines/vibe-density-engine";

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

interface ZoneIntelligenceSheetProps {
  entities: ZoneEntity[];
  zoneLat: number;
  zoneLng: number;
  radiusKm: number;
  onClose: () => void;
  onSelectEntity?: (entity: ZoneEntity) => void;
}

type VerticalTab = "all" | "food" | "stay" | "services" | "utility" | "mobility" | "nightlife";

const TABS: { id: VerticalTab; label: string; icon: React.ReactNode; matchTypes: string[] }[] = [
  { id: "all", label: "All", icon: <MapPin className="w-3.5 h-3.5" />, matchTypes: [] },
  { id: "food", label: "Food", icon: <Utensils className="w-3.5 h-3.5" />, matchTypes: ["restaurant", "food", "cafe", "bakery", "fast_food", "grocery"] },
  { id: "stay", label: "Stay", icon: <Hotel className="w-3.5 h-3.5" />, matchTypes: ["hotel", "hostel", "resort", "property", "apartment"] },
  { id: "services", label: "Services", icon: <Sparkles className="w-3.5 h-3.5" />, matchTypes: ["service", "services", "healthcare", "salon", "spa"] },
  { id: "utility", label: "Utility", icon: <ShoppingBag className="w-3.5 h-3.5" />, matchTypes: ["shop", "shops", "atm", "bank", "pharmacy", "exchange"] },
  { id: "mobility", label: "Mobility", icon: <Car className="w-3.5 h-3.5" />, matchTypes: ["driver", "taxi", "bus", "metro", "mobility"] },
  { id: "nightlife", label: "Nightlife", icon: <Moon className="w-3.5 h-3.5" />, matchTypes: ["bar", "club", "lounge", "nightclub"] },
];

/** Haversine distance in km */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ZoneIntelligenceSheet({
  entities, zoneLat, zoneLng, radiusKm, onClose, onSelectEntity,
}: ZoneIntelligenceSheetProps) {
  const [activeTab, setActiveTab] = useState<VerticalTab>("all");

  // Filter entities within radius of clicked zone point
  const zoneEntities = useMemo(() => {
    return entities
      .map(e => ({ ...e, zoneDistance: haversine(zoneLat, zoneLng, e.lat, e.lng) }))
      .filter(e => e.zoneDistance <= radiusKm)
      .sort((a, b) => a.zoneDistance - b.zoneDistance);
  }, [entities, zoneLat, zoneLng, radiusKm]);

  // Group by vertical
  const tabCounts = useMemo(() => {
    const counts: Record<VerticalTab, number> = { all: zoneEntities.length, food: 0, stay: 0, services: 0, utility: 0, mobility: 0, nightlife: 0 };
    for (const e of zoneEntities) {
      const cat = (e.category || e.type || "").toLowerCase();
      for (const tab of TABS) {
        if (tab.id !== "all" && tab.matchTypes.some(t => cat.includes(t))) {
          counts[tab.id]++;
          break;
        }
      }
    }
    return counts;
  }, [zoneEntities]);

  // Filter by active tab
  const filtered = useMemo(() => {
    if (activeTab === "all") return zoneEntities;
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab) return zoneEntities;
    return zoneEntities.filter(e => {
      const cat = (e.category || e.type || "").toLowerCase();
      return tab.matchTypes.some(t => cat.includes(t));
    });
  }, [zoneEntities, activeTab]);

  // Vibe
  const vibe = useMemo(() => {
    if (!zoneEntities.length) return null;
    return computeVibeDensity("zone-click", zoneEntities.map(e => ({
      category: e.category || e.type || "service",
      rating: e.rating,
    })), new Date().getHours());
  }, [zoneEntities]);

  if (zoneEntities.length === 0) {
    return (
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-border/20 px-4 py-6 text-center"
        style={{ background: "hsl(var(--card) / 0.97)" }}
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
      >
        <button onClick={onClose} className="absolute top-3 right-3">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <MapPin className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No places found in this zone</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Try increasing the radius</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-border/20 max-h-[65dvh] flex flex-col"
      style={{ background: "hsl(var(--card) / 0.97)" }}
      initial={{ y: 400 }}
      animate={{ y: 0 }}
      exit={{ y: 400 }}
      transition={{ type: "spring", damping: 25 }}
    >
      {/* Handle */}
      <div className="flex items-center justify-center py-2 shrink-0">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
      </div>

      {/* Header */}
      <div className="px-4 pb-2 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-foreground">Zone Intelligence</h3>
          <p className="text-[10px] text-muted-foreground">
            {zoneEntities.length} places • {radiusKm}km radius
          </p>
        </div>
        <div className="flex items-center gap-2">
          {vibe && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}
            >
              <Activity className="w-3 h-3" />
              <span className="capitalize">{vibe.vibe}</span>
              <span className="text-muted-foreground">• {vibe.crowdDensity}%</span>
            </div>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/20">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Vertical Tabs */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-semibold whitespace-nowrap border transition-all shrink-0"
                style={{
                  background: isActive ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted) / 0.15)",
                  borderColor: isActive ? "hsl(var(--accent) / 0.3)" : "transparent",
                  color: isActive ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                }}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && <span className="ml-0.5 text-[8px] opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entity List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
        {/* Top Picks label */}
        {filtered.length > 0 && (
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1 pt-1">
            {activeTab === "all" ? "Top Picks" : `Top ${TABS.find(t => t.id === activeTab)?.label}`} • {filtered.length} results
          </p>
        )}
        {filtered.map((e, i) => (
          <button
            key={e.id}
            onClick={() => onSelectEntity?.(e)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/10 text-left transition-all hover:border-accent/20 active:scale-[0.98]"
            style={{ background: i < 3 ? "hsl(var(--accent) / 0.04)" : "transparent" }}
          >
            {/* Rank */}
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{
                background: i < 3 ? "hsl(var(--accent) / 0.12)" : "hsl(var(--muted) / 0.15)",
                color: i < 3 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
              }}
            >
              {i + 1}
            </div>
            {/* Image */}
            {(e.imageUrl || e.image_url) ? (
              <img
                src={e.imageUrl || e.image_url}
                alt={e.name}
                className="w-9 h-9 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/50" />
              </div>
            )}
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-foreground truncate">{e.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground capitalize">{e.category || e.type}</span>
                {e.rating && e.rating > 0 && (
                  <span className="text-[9px] text-amber-400">★ {e.rating.toFixed(1)}</span>
                )}
              </div>
            </div>
            {/* Distance */}
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold text-foreground">
                {((e as any).zoneDistance * 1000).toFixed(0)}m
              </p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
