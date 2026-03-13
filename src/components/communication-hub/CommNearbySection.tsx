/**
 * CommNearbySection — Real-time nearby activity tracker.
 * Shows professionals, services, listings around the user like Uber/Deliveroo.
 * Uses Haversine RPC + browser geolocation.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  Radar, MapPin, Search, MessageCircle, Phone, Filter,
  Navigation, Loader2, Briefcase, Home, Wrench, ShoppingBag,
  ChevronDown, SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface NearbyItem {
  item_id: string;
  item_type: string;
  title: string;
  category: string;
  city: string;
  country: string;
  price: number;
  currency: string;
  photo_url: string | null;
  lat: number;
  lng: number;
  distance_km: number;
  provider_name: string | null;
  status: string;
}

type ItemTypeFilter = "all" | "service" | "concierge" | "real_estate";

const TYPE_FILTERS: { id: ItemTypeFilter; label: string; icon: typeof Briefcase }[] = [
  { id: "all", label: "All", icon: Radar },
  { id: "service", label: "Services", icon: Wrench },
  { id: "real_estate", label: "Real Estate", icon: Home },
  { id: "concierge", label: "Concierge", icon: ShoppingBag },
];

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200];

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function getTypeColor(type: string): string {
  switch (type) {
    case "service": return "hsl(var(--hud-cyan))";
    case "real_estate": return "hsl(142, 70%, 50%)";
    case "concierge": return "hsl(270, 80%, 65%)";
    default: return "hsl(var(--hud-cyan))";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "service": return "Service";
    case "real_estate": return "Real Estate";
    case "concierge": return "Concierge";
    default: return type;
  }
}

export default function CommNearbySection() {
  const navigate = useNavigate();
  const { lat, lng, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>("all");
  const [radius, setRadius] = useState(25);
  const [search, setSearch] = useState("");
  const [showRadiusOptions, setShowRadiusOptions] = useState(false);
  const [scanning, setScanning] = useState(false);

  const loadNearby = useCallback(async () => {
    if (!lat || !lng) return;
    setLoading(true);
    setScanning(true);

    const { data, error } = await supabase.rpc("search_nearby_items", {
      _lat: lat,
      _lng: lng,
      _radius_km: radius,
      _item_type: typeFilter === "all" ? null : typeFilter,
    });

    if (!error && data) {
      setItems(data as NearbyItem[]);
    }
    setLoading(false);
    // Keep scanning animation briefly for effect
    setTimeout(() => setScanning(false), 1200);
  }, [lat, lng, radius, typeFilter]);

  useEffect(() => {
    if (lat && lng) loadNearby();
  }, [lat, lng, loadNearby]);

  const filtered = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.provider_name || "").toLowerCase().includes(q) ||
      item.city.toLowerCase().includes(q);
  });

  const handleContact = (item: NearbyItem) => {
    haptic("medium");
    // Navigate to communication hub to start a conversation
    navigate(`/dashboard/communication?section=chats&search=${encodeURIComponent(item.provider_name || item.title)}`);
  };

  const handleCall = (item: NearbyItem) => {
    haptic("medium");
    navigate(`/dashboard/communication?section=calls`);
  };

  // ═══ No location state ═══
  if (!lat || !lng) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ background: "hsl(var(--hud-bg))" }}>
        {/* Radar animation */}
        <div className="relative w-32 h-32 mb-6">
          <svg viewBox="0 0 128 128" className="w-full h-full">
            <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.15" />
            <circle cx="64" cy="64" r="38" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.12" />
            <circle cx="64" cy="64" r="20" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.1" />
            <circle cx="64" cy="64" r="4" fill="hsl(var(--hud-cyan))" opacity="0.6" />
            {geoLoading && (
              <g>
                <animateTransform
                  attributeName="transform" type="rotate"
                  from="0 64 64" to="360 64 64" dur="2s" repeatCount="indefinite"
                />
                <line x1="64" y1="64" x2="64" y2="8" stroke="hsl(var(--hud-cyan))" strokeWidth="1" opacity="0.3" />
                <path
                  d="M 64 64 L 64 8 A 56 56 0 0 1 112.5 40 Z"
                  fill="hsl(var(--hud-cyan))" opacity="0.06"
                />
              </g>
            )}
          </svg>
        </div>

        {geoError ? (
          <>
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--hud-text))" }}>Location access needed</p>
            <p className="text-xs text-center mb-4" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {geoError}. Enable location to discover nearby activity.
            </p>
            <Button
              size="sm"
              onClick={requestLocation}
              className="gap-1.5"
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
            >
              <Navigation className="h-3.5 w-3.5" />
              Enable Location
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--hud-text))" }}>Scanning area...</p>
            <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Detecting your position
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* ═══ Header with radar indicator ═══ */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Radar
                className="h-5 w-5"
                style={{ color: "hsl(var(--hud-cyan))" }}
              />
              {scanning && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: "2px solid hsl(var(--hud-cyan))" }}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </div>
            <h2 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>Nearby</h2>
          </div>

          {/* Radius selector */}
          <div className="relative">
            <button
              onClick={() => { setShowRadiusOptions(!showRadiusOptions); haptic("light"); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: "hsl(var(--hud-cyan) / 0.1)",
                color: "hsl(var(--hud-cyan))",
                border: "1px solid hsl(var(--hud-cyan) / 0.2)",
              }}
            >
              <MapPin className="h-3 w-3" />
              {radius}km
              <ChevronDown className="h-3 w-3" />
            </button>
            <AnimatePresence>
              {showRadiusOptions && (
                <motion.div
                  className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 min-w-[100px]"
                  style={{
                    background: "hsl(var(--hud-surface))",
                    border: "1px solid hsl(var(--hud-border) / 0.15)",
                    boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)",
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                >
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => { setRadius(r); setShowRadiusOptions(false); haptic("selection"); }}
                      className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[hsl(var(--hud-cyan)/0.08)]"
                      style={{
                        color: radius === r ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text))",
                        fontWeight: radius === r ? 600 : 400,
                      }}
                    >
                      {r} km
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nearby..."
            className="pl-9 h-9 text-sm border-0"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
          />
        </div>

        {/* Type filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TYPE_FILTERS.map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => { haptic("selection"); setTypeFilter(f.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: typeFilter === f.id ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface) / 0.5)",
                  color: typeFilter === f.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.6)",
                  border: `1px solid ${typeFilter === f.id ? "hsl(var(--hud-cyan) / 0.2)" : "transparent"}`,
                }}
              >
                <Icon className="h-3 w-3" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            {filtered.length} found within {radius}km
          </span>
          <button
            onClick={() => { loadNearby(); haptic("medium"); }}
            className="text-[10px] font-medium flex items-center gap-1"
            style={{ color: "hsl(var(--hud-cyan))" }}
          >
            <Radar className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══ Results list ═══ */}
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            {/* Radar scanning animation */}
            <div className="relative w-20 h-20 mb-4">
              <svg viewBox="0 0 80 80" className="w-full h-full">
                <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.15" />
                <circle cx="40" cy="40" r="22" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.12" />
                <circle cx="40" cy="40" r="10" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.1" />
                <circle cx="40" cy="40" r="3" fill="hsl(var(--hud-cyan))" opacity="0.6" />
                <g>
                  <animateTransform
                    attributeName="transform" type="rotate"
                    from="0 40 40" to="360 40 40" dur="1.5s" repeatCount="indefinite"
                  />
                  <line x1="40" y1="40" x2="40" y2="5" stroke="hsl(var(--hud-cyan))" strokeWidth="1.5" opacity="0.4" />
                  <path
                    d="M 40 40 L 40 5 A 35 35 0 0 1 70.3 22 Z"
                    fill="hsl(var(--hud-cyan))" opacity="0.08"
                  />
                </g>
              </svg>
            </div>
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Scanning nearby area...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Radar className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              No activity found nearby
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
              Try increasing the radius or changing filters
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filtered.map((item, idx) => (
              <motion.div
                key={item.item_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[hsl(var(--hud-surface)/0.3)] transition-colors"
              >
                {/* Photo / type icon */}
                <div className="relative shrink-0">
                  {item.photo_url ? (
                    <div
                      className="w-12 h-12 rounded-xl bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${item.photo_url})`,
                        border: `1px solid hsl(var(--hud-border) / 0.1)`,
                      }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${getTypeColor(item.item_type)}15`,
                        border: `1px solid ${getTypeColor(item.item_type)}30`,
                      }}
                    >
                      {item.item_type === "real_estate" ? (
                        <Home className="h-5 w-5" style={{ color: getTypeColor(item.item_type) }} />
                      ) : item.item_type === "concierge" ? (
                        <ShoppingBag className="h-5 w-5" style={{ color: getTypeColor(item.item_type) }} />
                      ) : (
                        <Briefcase className="h-5 w-5" style={{ color: getTypeColor(item.item_type) }} />
                      )}
                    </div>
                  )}
                  {/* Distance badge */}
                  <div
                    className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                    style={{
                      background: "hsl(var(--hud-bg))",
                      color: "hsl(var(--hud-cyan))",
                      border: "1px solid hsl(var(--hud-cyan) / 0.3)",
                    }}
                  >
                    {formatDistance(item.distance_km)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${getTypeColor(item.item_type)}12`,
                        color: getTypeColor(item.item_type),
                      }}
                    >
                      {getTypeLabel(item.item_type)}
                    </span>
                    <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.provider_name && (
                      <span className="text-[11px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                        {item.provider_name}
                      </span>
                    )}
                    <span className="text-[11px] flex items-center gap-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      <MapPin className="h-2.5 w-2.5" />
                      {item.city}
                    </span>
                  </div>
                </div>

                {/* Price + actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                    {item.price > 0 ? `${item.price.toLocaleString()} ${item.currency}` : "Free"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleContact(item)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "hsl(var(--hud-cyan) / 0.1)" }}
                      title="Message"
                    >
                      <MessageCircle className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
                    </button>
                    <button
                      onClick={() => handleCall(item)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "hsl(142, 70%, 50%, 0.1)" }}
                      title="Call"
                    >
                      <Phone className="h-3.5 w-3.5" style={{ color: "hsl(142, 70%, 50%)" }} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
