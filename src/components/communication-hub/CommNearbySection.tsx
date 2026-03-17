/**
 * CommNearbySection — Live nearby activity tracker.
 * Shows listings, services, AND live professionals/users nearby.
 * Uber/Deliveroo-style discovery with presence + privacy controls.
 */
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { PresenceDot, presenceLabel } from "@/hooks/usePresenceStatus";
import {
  Radar, MapPin, Search, MessageCircle, Phone, Navigation,
  Briefcase, Home, ShoppingBag, ChevronDown, User, Eye, EyeOff,
  Shield, Clock, CheckCircle2, Users, Map, List,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ScrollableFilterBar from "@/components/ui/ScrollableFilterBar";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
const NearbyLeafletMap = lazy(() => import("./NearbyLeafletMap"));

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

interface NearbyUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  professional_category: string | null;
  verified: boolean;
  lat: number;
  lng: number;
  distance_km: number;
  last_seen_at: string;
}

type NearbyFilter = "all" | "service" | "real_estate" | "concierge" | "professionals" | "people";

const TYPE_FILTERS: { id: NearbyFilter; label: string; icon: typeof Briefcase }[] = [
  { id: "all", label: "All", icon: Radar },
  { id: "professionals", label: "Pros", icon: Briefcase },
  { id: "people", label: "People", icon: Users },
  { id: "service", label: "Services", icon: ShoppingBag },
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
    case "real_estate": return "hsl(var(--hud-success))";
    case "concierge": return "hsl(var(--hud-purple))";
    case "professional": return "hsl(var(--hud-warning))";
    case "person": return "hsl(var(--hud-cyan))";
    default: return "hsl(var(--hud-cyan))";
  }
}

export default function CommNearbySection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lat, lng, loading: geoLoading, error: geoError, permissionDenied, requestLocation } = useGeolocation();
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<NearbyFilter>("all");
  const [radius, setRadius] = useState(25);
  const [search, setSearch] = useState("");
  const [showRadiusOptions, setShowRadiusOptions] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Privacy settings
  const [myVisibility, setMyVisibility] = useState(false);
  const [myLocationSharing, setMyLocationSharing] = useState(false);
  const [whoCanSee, setWhoCanSee] = useState("contacts");

  // Load my privacy settings
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("user_presence").select("visible_on_nearby, location_sharing, who_can_see")
      .eq("user_id", user.id).single().then(({ data }) => {
        if (data) {
          setMyVisibility((data as any).visible_on_nearby || false);
          setMyLocationSharing((data as any).location_sharing || false);
          setWhoCanSee((data as any).who_can_see || "contacts");
        }
      });
  }, [user?.id]);

  const updatePrivacy = async (field: string, value: any) => {
    if (!user?.id) return;
    await supabase.from("user_presence").update({ [field]: value } as any).eq("user_id", user.id);
    haptic("light");
  };

  // Update my location in presence when sharing
  useEffect(() => {
    if (!user?.id || !lat || !lng || !myLocationSharing) return;
    supabase.from("user_presence").update({
      lat, lng,
      location_sharing: true,
      visible_on_nearby: myVisibility,
    } as any).eq("user_id", user.id);
  }, [lat, lng, myLocationSharing, myVisibility, user?.id]);

  const loadNearby = useCallback(async () => {
    if (!lat || !lng) return;
    setLoading(true);
    setScanning(true);
    setLoadError(null);

    try {
    const shouldLoadItems = ["all", "service", "real_estate", "concierge"].includes(typeFilter);
    const shouldLoadUsers = ["all", "professionals", "people"].includes(typeFilter);

    // Load items
    if (shouldLoadItems) {
      const { data, error } = await supabase.rpc("search_nearby_items", {
        _lat: lat, _lng: lng, _radius_km: radius,
        _item_type: ["service", "real_estate", "concierge"].includes(typeFilter) ? typeFilter : null,
      });
      if (error) throw error;
      if (data) setItems(data as NearbyItem[]);
    } else {
      setItems([]);
    }

    // Load nearby users from presence
    if (shouldLoadUsers) {
      const { data } = await supabase
        .from("user_presence")
        .select("user_id, display_name, avatar_url, status, professional_category, verified, lat, lng, last_seen_at")
        .eq("visible_on_nearby", true)
        .eq("location_sharing", true)
        .not("lat", "is", null)
        .not("lng", "is", null)
        .neq("user_id", user?.id || "");

      if (data) {
        // Calculate distance client-side for users
        const usersWithDist = (data as any[]).map(u => {
          const dist = haversine(lat, lng, u.lat, u.lng);
          return { ...u, distance_km: dist } as NearbyUser;
        }).filter(u => u.distance_km <= radius)
          .sort((a, b) => a.distance_km - b.distance_km);
        setNearbyUsers(usersWithDist);
      }
    } else {
      setNearbyUsers([]);
    }

    } catch (err: any) {
      setLoadError(err?.message || "Failed to load nearby data");
    }
    setLoading(false);
    setTimeout(() => setScanning(false), 1200);
  }, [lat, lng, radius, typeFilter, user?.id]);

  // Auto-load and poll for live updates (Deliveroo-style)
  useEffect(() => {
    if (!lat || !lng) return;
    loadNearby();
    // Poll every 10s for live feel
    const pollInterval = setInterval(() => {
      loadNearby();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [lat, lng, loadNearby]);

  // Haversine formula
  function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Filter
  const filteredItems = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) ||
      (item.provider_name || "").toLowerCase().includes(q) || item.city.toLowerCase().includes(q);
  });

  const filteredUsers = nearbyUsers.filter(u => {
    if (availableOnly && u.status !== "online") return false;
    if (verifiedOnly && !u.verified) return false;
    if (typeFilter === "professionals" && !u.professional_category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.display_name || "").toLowerCase().includes(q) ||
        (u.professional_category || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalResults = filteredItems.length + filteredUsers.length;

  const handleContact = (name: string) => {
    haptic("medium");
    navigate(`/dashboard/communication?section=chats&search=${encodeURIComponent(name)}`);
  };

  // ═══ No location state ═══
  if (!lat || !lng) {
    // Auto-request location when entering Nearby (only if not denied)
    if (!geoLoading && !geoError && !permissionDenied) {
      requestLocation();
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ background: "hsl(var(--hud-bg))" }}>
        <div className="relative w-32 h-32 mb-6">
          <svg viewBox="0 0 128 128" className="w-full h-full">
            <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.15" />
            <circle cx="64" cy="64" r="38" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.12" />
            <circle cx="64" cy="64" r="20" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.1" />
            <circle cx="64" cy="64" r="4" fill="hsl(var(--hud-cyan))" opacity="0.6" />
            {geoLoading && (
              <g>
                <animateTransform attributeName="transform" type="rotate" from="0 64 64" to="360 64 64" dur="2s" repeatCount="indefinite" />
                <line x1="64" y1="64" x2="64" y2="8" stroke="hsl(var(--hud-cyan))" strokeWidth="1" opacity="0.3" />
                <path d="M 64 64 L 64 8 A 56 56 0 0 1 112.5 40 Z" fill="hsl(var(--hud-cyan))" opacity="0.06" />
              </g>
            )}
          </svg>
        </div>
        {permissionDenied ? (
          <>
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--hud-text))" }}>Localisation requise</p>
            <p className="text-xs text-center mb-4 max-w-[260px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              La permission a été refusée. Ouvrez les réglages de votre navigateur pour activer la localisation, puis revenez ici.
            </p>
            <Button size="sm" onClick={requestLocation} className="gap-1.5" style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              <Navigation className="h-3.5 w-3.5" /> Réessayer
            </Button>
          </>
        ) : geoError ? (
          <>
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--hud-text))" }}>Localisation requise</p>
            <p className="text-xs text-center mb-4" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {geoError}
            </p>
            <Button size="sm" onClick={requestLocation} className="gap-1.5" style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              <Navigation className="h-3.5 w-3.5" /> Activer la localisation
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--hud-text))" }}>Scanning area...</p>
            <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Detecting your position</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Radar className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
              {scanning && (
                <motion.div className="absolute inset-0 rounded-full" style={{ border: "2px solid hsl(var(--hud-cyan))" }}
                  initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }} />
              )}
            </div>
            <h2 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>Nearby</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Privacy button */}
            <button onClick={() => { setShowPrivacy(true); haptic("light"); }}
              className="p-1.5 rounded-full" style={{ color: myVisibility ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
              {myVisibility ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            {/* Radius */}
            <div className="relative">
              <button onClick={() => { setShowRadiusOptions(!showRadiusOptions); haptic("light"); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))", border: "1px solid hsl(var(--hud-cyan) / 0.2)" }}>
                <MapPin className="h-3 w-3" /> {radius}km <ChevronDown className="h-3 w-3" />
              </button>
              <AnimatePresence>
                {showRadiusOptions && (
                  <motion.div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 min-w-[100px]"
                    style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)" }}
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                    {RADIUS_OPTIONS.map(r => (
                      <button key={r} onClick={() => { setRadius(r); setShowRadiusOptions(false); haptic("selection"); }}
                        className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[hsl(var(--hud-cyan)/0.08)]"
                        style={{ color: radius === r ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text))", fontWeight: radius === r ? 600 : 400 }}>
                        {r} km
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nearby..."
            className="pl-9 h-9 text-sm border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
        </div>

        {/* Filters */}
        <ScrollableFilterBar<NearbyFilter>
          options={TYPE_FILTERS.map(f => ({ id: f.id, label: f.label, icon: f.icon }))}
          value={typeFilter}
          onChange={setTypeFilter}
        />

        {/* Quick toggles */}
        {(typeFilter === "professionals" || typeFilter === "people" || typeFilter === "all") && (
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => { setAvailableOnly(!availableOnly); haptic("light"); }}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
              style={{
                background: availableOnly ? "hsl(var(--hud-success) / 0.12)" : "transparent",
                color: availableOnly ? "hsl(var(--hud-success))" : "hsl(var(--hud-text-dim) / 0.5)",
                border: `1px solid ${availableOnly ? "hsl(var(--hud-success) / 0.2)" : "hsl(var(--hud-border) / 0.1)"}`,
              }}>
              <Clock className="h-2.5 w-2.5" /> Available now
            </button>
            <button onClick={() => { setVerifiedOnly(!verifiedOnly); haptic("light"); }}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
              style={{
                background: verifiedOnly ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
                color: verifiedOnly ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
                border: `1px solid ${verifiedOnly ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.1)"}`,
              }}>
              <CheckCircle2 className="h-2.5 w-2.5" /> Verified
            </button>
          </div>
        )}

        {/* Stats + View Toggle */}
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="text-[10px] uppercase tracking-wider font-medium flex-1" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            {totalResults} found within {radius}km
          </span>
          {/* View mode toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
            <button onClick={() => { setViewMode("list"); haptic("selection"); }}
              className="px-2 py-1 flex items-center gap-1 text-[10px]"
              style={{
                background: viewMode === "list" ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface) / 0.3)",
                color: viewMode === "list" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
              }}>
              <List className="h-3 w-3" /> List
            </button>
            <button onClick={() => { setViewMode("map"); haptic("selection"); }}
              className="px-2 py-1 flex items-center gap-1 text-[10px]"
              style={{
                background: viewMode === "map" ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface) / 0.3)",
                color: viewMode === "map" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
              }}>
              <Map className="h-3 w-3" /> Map
            </button>
          </div>
          <button onClick={() => { loadNearby(); haptic("medium"); }}
            className="text-[10px] font-medium flex items-center gap-1" style={{ color: "hsl(var(--hud-cyan))" }}>
            <Radar className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Map View — Interactive Deliveroo/Snap-style */}
        {viewMode === "map" && lat && lng ? (
          <div className="relative w-full h-full min-h-[400px]" style={{ background: "hsl(var(--hud-bg))" }}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <Radar className="h-8 w-8 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
              </div>
            }>
              <NearbyLeafletMap
                lat={lat}
                lng={lng}
                radius={radius}
                users={filteredUsers}
                items={filteredItems}
                onRefresh={loadNearby}
              />
            </Suspense>

            {/* Top stats overlay */}
            <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 z-[1000]">
              {filteredUsers.length > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold backdrop-blur-md"
                  style={{ background: "hsl(var(--hud-bg) / 0.85)", color: "hsl(var(--hud-cyan))", border: "1px solid hsl(var(--hud-cyan) / 0.2)" }}>
                  <User className="h-3 w-3" /> {filteredUsers.length} people nearby
                </div>
              )}
              {filteredItems.length > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold backdrop-blur-md"
                  style={{ background: "hsl(var(--hud-bg) / 0.85)", color: "hsl(var(--hud-success))", border: "1px solid hsl(var(--hud-success) / 0.2)" }}>
                  <MapPin className="h-3 w-3" /> {filteredItems.length} listings
                </div>
              )}
            </div>

            {/* Floating scan button */}
            <div className="absolute bottom-4 right-4 z-[1000]">
              <motion.button
                onClick={() => { loadNearby(); haptic("medium"); }}
                className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md pointer-events-auto"
                style={{ background: "hsl(var(--hud-bg) / 0.9)", border: "1px solid hsl(var(--hud-cyan) / 0.3)", boxShadow: "0 4px 20px hsl(0 0% 0% / 0.3)" }}
                whileTap={{ scale: 0.9 }}
              >
                <Radar className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
              </motion.button>
              {scanning && (
                <motion.div className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: "2px solid hsl(var(--hud-cyan))" }}
                  initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }} />
              )}
            </div>

            {/* Recenter button */}
            <div className="absolute bottom-4 left-4 z-[1000]">
              <button
                onClick={() => { requestLocation(); haptic("light"); }}
                className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md pointer-events-auto"
                style={{ background: "hsl(var(--hud-bg) / 0.9)", border: "1px solid hsl(var(--hud-border) / 0.2)" }}>
                <Navigation className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
              </button>
            </div>
          </div>
        ) : viewMode === "list" || !lat || !lng ? (
          <>
        {loadError ? (
          <ErrorState
            message={`Nearby scan failed: ${loadError}`}
            onRetry={loadNearby}
          />
        ) : loading && totalResults === 0 ? (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-2.5 w-3/5" />
                </div>
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        ) : totalResults === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Radar className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>No activity found nearby</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Try increasing the radius or changing filters</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {/* Nearby users first */}
            {filteredUsers.map((u, idx) => (
              <motion.div key={u.user_id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => handleContact(u.display_name || "user")}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[hsl(var(--hud-surface)/0.3)] active:bg-[hsl(var(--hud-surface)/0.5)] transition-colors cursor-pointer">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: u.avatar_url ? `url(${u.avatar_url}) center/cover` : "hsl(var(--hud-cyan) / 0.1)",
                      border: "1px solid hsl(var(--hud-border) / 0.1)",
                    }}>
                    {!u.avatar_url && <User className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />}
                  </div>
                  {/* Presence dot */}
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <PresenceDot status={u.status} size={10} />
                  </div>
                  {/* Distance */}
                  <div className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                    style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-cyan))", border: "1px solid hsl(var(--hud-cyan) / 0.3)" }}>
                    {formatDistance(u.distance_km)}
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {u.display_name || "User"}
                    </span>
                    {u.verified && <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium" style={{ color: presenceColor(u.status) }}>
                      {presenceLabel(u.status)}
                    </span>
                    {u.professional_category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "hsl(var(--hud-warning) / 0.1)", color: "hsl(var(--hud-warning))" }}>
                        {u.professional_category}
                      </span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleContact(u.display_name || "user"); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "hsl(var(--hud-cyan) / 0.1)" }}>
                    <MessageCircle className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); haptic("medium"); navigate("/dashboard/communication?section=calls"); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "hsl(var(--hud-success) / 0.1)" }}>
                    <Phone className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-success))" }} />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Items */}
            {filteredItems.map((item, idx) => (
              <motion.div key={item.item_id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (filteredUsers.length + idx) * 0.03 }}
                onClick={() => {
                  haptic("light");
                  if (item.item_type === "concierge") navigate(`/explore`);
                  else if (item.item_type === "real_estate") navigate(`/explore`);
                  else navigate(`/explore`);
                }}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-[hsl(var(--hud-surface)/0.3)] active:bg-[hsl(var(--hud-surface)/0.5)] transition-colors cursor-pointer">
                <div className="relative shrink-0">
                  {item.photo_url ? (
                    <div className="w-12 h-12 rounded-xl bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.photo_url})`, border: "1px solid hsl(var(--hud-border) / 0.1)" }} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${getTypeColor(item.item_type)}15`, border: `1px solid ${getTypeColor(item.item_type)}30` }}>
                      {item.item_type === "real_estate" ? <Home className="h-5 w-5" style={{ color: getTypeColor(item.item_type) }} /> :
                       item.item_type === "concierge" ? <ShoppingBag className="h-5 w-5" style={{ color: getTypeColor(item.item_type) }} /> :
                       <Briefcase className="h-5 w-5" style={{ color: getTypeColor(item.item_type) }} />}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                    style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-cyan))", border: "1px solid hsl(var(--hud-cyan) / 0.3)" }}>
                    {formatDistance(item.distance_km)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold truncate block" style={{ color: "hsl(var(--hud-text))" }}>{item.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: `${getTypeColor(item.item_type)}12`, color: getTypeColor(item.item_type) }}>
                      {item.item_type === "real_estate" ? "Real Estate" : item.item_type === "concierge" ? "Concierge" : "Service"}
                    </span>
                    <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{item.category}</span>
                  </div>
                  {item.provider_name && (
                    <span className="text-[11px] truncate block mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      <MapPin className="h-2.5 w-2.5 inline mr-0.5" />{item.city}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                    {item.price > 0 ? `${item.price.toLocaleString()} ${item.currency}` : "Free"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleContact(item.provider_name || item.title); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.1)" }}>
                      <MessageCircle className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); haptic("medium"); navigate("/dashboard/communication?section=calls"); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-success) / 0.1)" }}>
                      <Phone className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-success))" }} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
          </>
        ) : null}
      </div>

      {/* Privacy Settings Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
              <Shield className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Privacy & Visibility
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm" style={{ color: "hsl(var(--hud-text))" }}>Visible on Nearby</Label>
                <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Others can discover you nearby</p>
              </div>
              <Switch checked={myVisibility} onCheckedChange={v => { setMyVisibility(v); updatePrivacy("visible_on_nearby", v); }} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm" style={{ color: "hsl(var(--hud-text))" }}>Share Live Location</Label>
                <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Share your position in real-time</p>
              </div>
              <Switch checked={myLocationSharing} onCheckedChange={v => { setMyLocationSharing(v); updatePrivacy("location_sharing", v); }} />
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: "hsl(var(--hud-text-dim))" }}>Who can see me</Label>
              <Select value={whoCanSee} onValueChange={v => { setWhoCanSee(v); updatePrivacy("who_can_see", v); }}>
                <SelectTrigger className="border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="contacts">Contacts Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function presenceColor(status: string): string {
  const colors: Record<string, string> = {
    online: "hsl(var(--hud-success))",
    away: "hsl(var(--hud-warning))",
    busy: "hsl(var(--hud-danger))",
    in_call: "hsl(var(--hud-purple))",
    dnd: "hsl(var(--hud-danger))",
    offline: "hsl(var(--hud-text-dim) / 0.4)",
  };
  return colors[status] || colors.offline;
}
