/**
 * OrbitRadar — Global discovery engine with 4 radar modes.
 * Satellite-style scanning UI with real-time markers.
 * Modes: Local, City, Global, Business
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar, MapPin, Navigation, Briefcase, Globe2, Building2,
  MessageCircle, Phone, Eye, ExternalLink, X, Search,
  Filter, ChevronDown, EyeOff, Crosshair, Zap,
  User, Home, ShoppingBag, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────

type RadarMode = "local" | "city" | "global" | "business";

interface RadarMarker {
  id: string;
  type: "user" | "listing" | "service" | "activity";
  title: string;
  subtitle?: string;
  photo?: string | null;
  lat: number;
  lng: number;
  distance_km: number;
  status?: string;
  price?: number;
  currency?: string;
  category?: string;
  verified?: boolean;
  online?: boolean;
}

interface RadarConfig {
  label: string;
  icon: typeof Radar;
  description: string;
  minRadius: number;
  maxRadius: number;
  defaultRadius: number;
}

const RADAR_MODES: Record<RadarMode, RadarConfig> = {
  local: {
    label: "Local",
    icon: Crosshair,
    description: "100m – 10km around you",
    minRadius: 0.1,
    maxRadius: 10,
    defaultRadius: 5,
  },
  city: {
    label: "City",
    icon: Building2,
    description: "Full city scan",
    minRadius: 10,
    maxRadius: 50,
    defaultRadius: 25,
  },
  global: {
    label: "Global",
    icon: Globe2,
    description: "Worldwide activity clusters",
    minRadius: 50,
    maxRadius: 20000,
    defaultRadius: 500,
  },
  business: {
    label: "Business",
    icon: Briefcase,
    description: "Professionals available now",
    minRadius: 0.1,
    maxRadius: 50,
    defaultRadius: 10,
  },
};

const TYPE_COLORS: Record<string, string> = {
  user: "hsl(var(--hud-cyan))",
  listing: "hsl(var(--hud-success))",
  service: "hsl(var(--hud-purple))",
  activity: "hsl(var(--hud-warning))",
};

const TYPE_ICONS: Record<string, typeof User> = {
  user: User,
  listing: Home,
  service: ShoppingBag,
  activity: Zap,
};

// ─── Component ─────────────────────────────────────────────

export default function OrbitRadar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lat, lng, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  const [mode, setMode] = useState<RadarMode>("local");
  const [markers, setMarkers] = useState<RadarMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<RadarMarker | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(["user", "listing", "service", "activity"]));
  const [invisibleMode, setInvisibleMode] = useState(false);
  const [approxLocation, setApproxLocation] = useState(false);
  const sweepAngleRef = useRef(0);
  const radarRef = useRef<HTMLDivElement>(null);

  const config = RADAR_MODES[mode];

  // ─── Load markers ───────────────────────────────────────

  const loadMarkers = useCallback(async () => {
    if (!lat || !lng) return;
    setLoading(true);
    setScanning(true);

    const radius = config.defaultRadius;
    const allMarkers: RadarMarker[] = [];

    try {
      // Load nearby items (listings/services)
      if (typeFilters.has("listing") || typeFilters.has("service")) {
        const { data: items } = await supabase.rpc("search_nearby_items", {
          _lat: lat, _lng: lng, _radius_km: radius,
          _item_type: null,
        });
        if (items) {
          (items as any[]).forEach(item => {
            allMarkers.push({
              id: item.item_id,
              type: item.item_type === "real_estate" ? "listing" : "service",
              title: item.title,
              subtitle: item.provider_name || item.category,
              photo: item.photo_url,
              lat: item.lat, lng: item.lng,
              distance_km: item.distance_km,
              price: item.price,
              currency: item.currency,
              category: item.category,
              status: item.status,
            });
          });
        }
      }

      // Load nearby users
      if (typeFilters.has("user")) {
        const query = supabase
          .from("user_presence")
          .select("user_id, display_name, avatar_url, status, professional_category, verified, lat, lng")
          .eq("visible_on_nearby", true)
          .eq("location_sharing", true)
          .not("lat", "is", null)
          .not("lng", "is", null)
          .neq("user_id", user?.id || "");

        // Business mode: only professionals
        if (mode === "business") {
          query.not("professional_category", "is", null);
        }

        const { data: users } = await query;
        if (users) {
          (users as any[]).forEach(u => {
            const dist = haversine(lat, lng, u.lat, u.lng);
            if (dist <= radius) {
              allMarkers.push({
                id: u.user_id,
                type: "user",
                title: u.display_name || "User",
                subtitle: u.professional_category || undefined,
                photo: u.avatar_url,
                lat: u.lat, lng: u.lng,
                distance_km: dist,
                verified: u.verified,
                online: u.status === "online",
                category: u.professional_category,
              });
            }
          });
        }
      }

      allMarkers.sort((a, b) => a.distance_km - b.distance_km);
      setMarkers(allMarkers);
    } catch (err) {
      console.error("[Radar] Load failed:", err);
    }

    setLoading(false);
    setTimeout(() => setScanning(false), 1500);
  }, [lat, lng, mode, config.defaultRadius, typeFilters, user?.id]);

  useEffect(() => {
    if (!lat || !lng) return;
    loadMarkers();
    const poll = setInterval(loadMarkers, 15000);
    return () => clearInterval(poll);
  }, [loadMarkers, lat, lng]);

  // Auto-request location
  useEffect(() => {
    if (!lat && !lng && !geoLoading && !geoError) requestLocation();
  }, [lat, lng, geoLoading, geoError, requestLocation]);

  // Filter markers
  const filtered = markers.filter(m => {
    if (!typeFilters.has(m.type)) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q) ||
        (m.subtitle || "").toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q);
    }
    return true;
  });

  // SVG radar dimensions
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 140;

  // Convert marker to SVG position
  const markerToSvg = (marker: RadarMarker) => {
    const normalizedDist = Math.min(marker.distance_km / config.defaultRadius, 1);
    const r = normalizedDist * maxR;
    // Use actual bearing for position
    const bearing = getBearing(lat!, lng!, marker.lat, marker.lng);
    const rad = (bearing - 90) * Math.PI / 180;
    return {
      x: cx + Math.cos(rad) * r,
      y: cy + Math.sin(rad) * r,
    };
  };

  // ─── No location state ───────────────────────────────────

  if (!lat || !lng) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ background: "hsl(var(--hud-bg))" }}>
        <RadarScannerEmpty loading={geoLoading} />
        {geoError ? (
          <>
            <p className="text-sm font-medium mt-4 mb-1" style={{ color: "hsl(var(--hud-text))" }}>Location Required</p>
            <p className="text-xs text-center mb-4" style={{ color: "hsl(var(--hud-text-dim))" }}>{geoError}</p>
            <Button size="sm" onClick={requestLocation} className="gap-1.5" style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              <Navigation className="h-3.5 w-3.5" /> Enable Location
            </Button>
          </>
        ) : (
          <p className="text-sm mt-4" style={{ color: "hsl(var(--hud-text-dim))" }}>Acquiring position…</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* ═══ Mode Selector ═══ */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-1.5 rounded-xl p-1" style={{
          background: "hsl(var(--hud-surface))",
          border: "1px solid hsl(var(--hud-border) / 0.1)",
        }}>
          {(Object.keys(RADAR_MODES) as RadarMode[]).map(m => {
            const cfg = RADAR_MODES[m];
            const Icon = cfg.icon;
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => { setMode(m); haptic("selection"); }}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: active ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
                  color: active ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Controls ═══ */}
      <div className="px-4 py-2 flex items-center gap-2 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search radar…"
            className="pl-8 h-8 text-xs border-0"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
          />
        </div>
        <button onClick={() => { setShowFilters(!showFilters); haptic("light"); }}
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text-dim))" }}>
          <Filter className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setShowPrivacy(true); haptic("light"); }}
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(var(--hud-surface))", color: invisibleMode ? "hsl(var(--hud-warning))" : "hsl(var(--hud-text-dim))" }}>
          {invisibleMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Filter chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 pb-2"
          >
            <div className="flex flex-wrap gap-1.5">
              {(["user", "listing", "service", "activity"] as const).map(t => {
                const Icon = TYPE_ICONS[t];
                const active = typeFilters.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => {
                      const next = new Set(typeFilters);
                      if (active) next.delete(t); else next.add(t);
                      setTypeFilters(next);
                      haptic("light");
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                    style={{
                      background: active ? `${TYPE_COLORS[t]}15` : "hsl(var(--hud-surface))",
                      color: active ? TYPE_COLORS[t] : "hsl(var(--hud-text-dim) / 0.5)",
                      border: `1px solid ${active ? `${TYPE_COLORS[t]}30` : "hsl(var(--hud-border) / 0.1)"}`,
                    }}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {t.charAt(0).toUpperCase() + t.slice(1)}s
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Radar Visualization ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0" ref={radarRef}>
        <div className="relative" style={{ width: size, height: size, maxWidth: "100%" }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            <defs>
              <filter id="radarGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--hud-cyan))" stopOpacity="0" />
                <stop offset="70%" stopColor="hsl(var(--hud-cyan))" stopOpacity="0.06" />
                <stop offset="100%" stopColor="hsl(var(--hud-cyan))" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Range rings */}
            {[0.25, 0.5, 0.75, 1].map((frac, i) => (
              <circle key={i} cx={cx} cy={cy} r={maxR * frac} fill="none"
                stroke="hsl(var(--hud-cyan))" strokeWidth="0.5"
                opacity={0.08 + i * 0.03} strokeDasharray={i < 2 ? "2 6" : "none"} />
            ))}

            {/* Crosshairs */}
            {[0, 90].map(angle => {
              const rad = (angle * Math.PI) / 180;
              return (
                <line key={angle}
                  x1={cx - Math.cos(rad) * maxR} y1={cy - Math.sin(rad) * maxR}
                  x2={cx + Math.cos(rad) * maxR} y2={cy + Math.sin(rad) * maxR}
                  stroke="hsl(var(--hud-cyan))" strokeWidth="0.3" opacity="0.08"
                />
              );
            })}

            {/* Rotating sweep */}
            <g filter="url(#radarGlow)">
              <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
                <animateTransform
                  attributeName="transform" type="rotate"
                  from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                  dur={scanning ? "2s" : "4s"} repeatCount="indefinite"
                />
                <path
                  d={`M ${cx} ${cy} L ${cx + maxR} ${cy} A ${maxR} ${maxR} 0 0 1 ${cx + maxR * Math.cos(Math.PI / 6)} ${cy + maxR * Math.sin(Math.PI / 6)} Z`}
                  fill="url(#sweepGrad)" opacity="0.6"
                />
                <line x1={cx} y1={cy} x2={cx + maxR} y2={cy}
                  stroke="hsl(var(--hud-cyan))" strokeWidth="1" opacity="0.3" />
              </g>
            </g>

            {/* Center dot (you) */}
            <circle cx={cx} cy={cy} r="4" fill="hsl(var(--hud-cyan))" filter="url(#radarGlow)">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r="8" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.3">
              <animate attributeName="r" values="8;16;8" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Markers */}
            {filtered.slice(0, 50).map(marker => {
              const pos = markerToSvg(marker);
              const color = TYPE_COLORS[marker.type];
              const markerR = marker.type === "user" ? 5 : 4;
              return (
                <g key={marker.id} className="cursor-pointer" onClick={() => { setSelectedMarker(marker); haptic("light"); }}>
                  {/* Pulse */}
                  <circle cx={pos.x} cy={pos.y} r={markerR} fill="none" stroke={color} strokeWidth="0.5" opacity="0">
                    <animate attributeName="r" values={`${markerR};${markerR + 6};${markerR}`} dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  {/* Marker dot */}
                  <circle cx={pos.x} cy={pos.y} r={markerR} fill={color} opacity="0.9" filter="url(#radarGlow)">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur={`${1.5 + Math.random()}s`} repeatCount="indefinite" />
                  </circle>
                  {/* Online indicator for users */}
                  {marker.online && (
                    <circle cx={pos.x + markerR - 1} cy={pos.y - markerR + 1} r="2"
                      fill="hsl(var(--hud-success))" stroke="hsl(var(--hud-bg))" strokeWidth="0.5" />
                  )}
                </g>
              );
            })}

            {/* Range labels */}
            <text x={cx + 4} y={cy - maxR * 0.25 + 3} fill="hsl(var(--hud-text-dim))" opacity="0.3" fontSize="7" fontFamily="monospace">
              {(config.defaultRadius * 0.25).toFixed(config.defaultRadius < 1 ? 1 : 0)}km
            </text>
            <text x={cx + 4} y={cy - maxR * 0.5 + 3} fill="hsl(var(--hud-text-dim))" opacity="0.3" fontSize="7" fontFamily="monospace">
              {(config.defaultRadius * 0.5).toFixed(config.defaultRadius < 1 ? 1 : 0)}km
            </text>
            <text x={cx + 4} y={cy - maxR + 3} fill="hsl(var(--hud-text-dim))" opacity="0.3" fontSize="7" fontFamily="monospace">
              {config.defaultRadius}km
            </text>
          </svg>

          {/* Stats overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }}>
              {config.label} • {filtered.length} signals
            </span>
            <button onClick={() => { loadMarkers(); haptic("medium"); }}
              className="text-[9px] font-mono uppercase flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
              <Radar className="h-2.5 w-2.5" /> Scan
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Results List ═══ */}
      <div className="shrink-0 max-h-[30vh] overflow-y-auto px-4 pb-4">
        <div className="space-y-1.5">
          {filtered.slice(0, 20).map(marker => (
            <MarkerListItem
              key={marker.id}
              marker={marker}
              onSelect={() => { setSelectedMarker(marker); haptic("light"); }}
              onMessage={() => {
                haptic("medium");
                navigate(`/dashboard/communication?section=chats&search=${encodeURIComponent(marker.title)}`);
              }}
            />
          ))}
          {filtered.length === 0 && !loading && (
            <p className="text-center text-xs py-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
              No signals in range
            </p>
          )}
        </div>
      </div>

      {/* ═══ Preview Card ═══ */}
      <AnimatePresence>
        {selectedMarker && (
          <MarkerPreviewCard
            marker={selectedMarker}
            onClose={() => setSelectedMarker(null)}
            onMessage={() => {
              haptic("medium");
              navigate(`/dashboard/communication?section=chats&search=${encodeURIComponent(selectedMarker.title)}`);
              setSelectedMarker(null);
            }}
            onCall={() => {
              haptic("medium");
              navigate(`/dashboard/communication?section=calls`);
              setSelectedMarker(null);
            }}
            onOpen={() => {
              haptic("medium");
              if (selectedMarker.type === "listing") navigate(`/dashboard/marketplace`);
              else if (selectedMarker.type === "service") navigate(`/dashboard/marketplace`);
              setSelectedMarker(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ═══ Privacy Dialog ═══ */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-sm" style={{
          background: "hsl(var(--hud-bg))",
          border: "1px solid hsl(var(--hud-border) / 0.2)",
        }}>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
              <Eye className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
              Radar Privacy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <PrivacyToggle
              label="Invisible Mode"
              description="Others cannot see you on radar"
              checked={invisibleMode}
              onChange={(v) => { setInvisibleMode(v); haptic("light"); }}
            />
            <PrivacyToggle
              label="Approximate Location"
              description="Share city-level position only"
              checked={approxLocation}
              onChange={(v) => { setApproxLocation(v); haptic("light"); }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub Components ────────────────────────────────────────

function RadarScannerEmpty({ loading }: { loading: boolean }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.12" />
      <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.1" />
      <circle cx={cx} cy={cy} r={r * 0.33} fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" opacity="0.08" />
      <circle cx={cx} cy={cy} r="3" fill="hsl(var(--hud-cyan))" opacity="0.6" />
      {loading && (
        <g>
          <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="2s" repeatCount="indefinite" />
          <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="hsl(var(--hud-cyan))" strokeWidth="1" opacity="0.3" />
          <path d={`M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(Math.PI / 6)} ${cy + r * Math.sin(Math.PI / 6)} Z`}
            fill="hsl(var(--hud-cyan))" opacity="0.06" />
        </g>
      )}
    </svg>
  );
}

function MarkerListItem({ marker, onSelect, onMessage }: {
  marker: RadarMarker;
  onSelect: () => void;
  onMessage: () => void;
}) {
  const Icon = TYPE_ICONS[marker.type];
  const color = TYPE_COLORS[marker.type];

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors hover:bg-[hsl(var(--hud-surface)/0.5)]"
      style={{ background: "hsl(var(--hud-surface) / 0.2)" }}
    >
      {marker.photo ? (
        <img src={marker.photo} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{
          background: `${color}15`,
          border: `1px solid ${color}25`,
        }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{marker.title}</p>
          {marker.verified && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />}
          {marker.online && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--hud-success))" }} />}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
            {formatDist(marker.distance_km)}
          </span>
          {marker.price && (
            <span className="text-[10px] font-medium" style={{ color }}>
              {marker.price > 1000 ? `${(marker.price / 1000).toFixed(0)}k` : marker.price} {marker.currency}
            </span>
          )}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onMessage(); }}
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
        <MessageCircle className="h-3 w-3" />
      </button>
    </button>
  );
}

function MarkerPreviewCard({ marker, onClose, onMessage, onCall, onOpen }: {
  marker: RadarMarker;
  onClose: () => void;
  onMessage: () => void;
  onCall: () => void;
  onOpen: () => void;
}) {
  const Icon = TYPE_ICONS[marker.type];
  const color = TYPE_COLORS[marker.type];

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 safe-area-pb"
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="rounded-2xl overflow-hidden" style={{
        background: "hsl(var(--hud-surface))",
        border: "1px solid hsl(var(--hud-border) / 0.2)",
        boxShadow: "0 -8px 40px hsl(0 0% 0% / 0.4)",
      }}>
        {/* Header */}
        <div className="p-4 flex items-start gap-3">
          {marker.photo ? (
            <img src={marker.photo} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{
              background: `${color}12`,
              border: `1px solid ${color}25`,
            }}>
              <Icon className="h-6 w-6" style={{ color }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold truncate" style={{ color: "hsl(var(--hud-text))" }}>{marker.title}</h3>
              {marker.verified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />}
            </div>
            {marker.subtitle && (
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--hud-text-dim))" }}>{marker.subtitle}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{
                borderColor: `${color}30`,
                color,
              }}>
                {marker.type}
              </Badge>
              <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {formatDist(marker.distance_km)}
              </span>
              {marker.price && (
                <span className="text-xs font-semibold" style={{ color }}>
                  {marker.price.toLocaleString()} {marker.currency}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--hud-surface-2))" }}>
            <X className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim))" }} />
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <ActionButton icon={MessageCircle} label="Message" onClick={onMessage} color="hsl(var(--hud-cyan))" />
          <ActionButton icon={Phone} label="Call" onClick={onCall} color="hsl(var(--hud-success))" />
          {(marker.type === "listing" || marker.type === "service") && (
            <ActionButton icon={ExternalLink} label="Open" onClick={onOpen} color="hsl(var(--hud-purple))" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ icon: Icon, label, onClick, color }: {
  icon: typeof MessageCircle;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium active:scale-95 transition-transform"
      style={{
        background: `${color}12`,
        color,
        border: `1px solid ${color}20`,
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function PrivacyToggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium" style={{ color: "hsl(var(--hud-text))" }}>{label}</p>
        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
