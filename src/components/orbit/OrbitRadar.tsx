/**
 * OrbitRadar — Signature global discovery engine.
 * Tactical satellite-inspired UI with 4 scan modes.
 * Real data integration via search_nearby_items RPC + user_presence.
 * Privacy-first: invisible mode, approximate location, contact controls.
 */
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar, MapPin, Navigation, Briefcase, Globe2, Building2,
  MessageCircle, Phone, Eye, ExternalLink, X, Search,
  Filter, EyeOff, Crosshair, Zap, Video,
  User, Home, ShoppingBag, CheckCircle2, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import NearbyLeafletMap from "@/components/communication-hub/NearbyLeafletMap";

// ─── Types ─────────────────────────────────────────────────

type RadarMode = "local" | "city" | "global" | "business";

interface RadarSignal {
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

interface ModeConfig {
  label: string;
  icon: typeof Radar;
  radius: number;
  desc: string;
}

const MODES: Record<RadarMode, ModeConfig> = {
  local:    { label: "Local",    icon: Crosshair,  radius: 10,   desc: "100m – 10km" },
  city:     { label: "City",     icon: Building2,   radius: 50,   desc: "City-wide" },
  global:   { label: "Global",   icon: Globe2,      radius: 500,  desc: "Worldwide" },
  business: { label: "Business", icon: Briefcase,   radius: 25,   desc: "Pros now" },
};

const SIGNAL_COLORS: Record<string, string> = {
  user:     "var(--hud-cyan)",
  listing:  "var(--hud-success)",
  service:  "var(--hud-purple)",
  activity: "var(--hud-warning)",
};

const SIGNAL_ICONS: Record<string, typeof User> = {
  user: User, listing: Home, service: ShoppingBag, activity: Zap,
};

// ─── Main Component ────────────────────────────────────────

export default function OrbitRadar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lat, lng, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  const [mode, setMode] = useState<RadarMode>("local");
  const [signals, setSignals] = useState<RadarSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<RadarSignal | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [activeTypes, setActiveTypes] = useState(new Set(["user", "listing", "service", "activity"]));
  const [invisibleMode, setInvisibleMode] = useState(false);
  const [approxLocation, setApproxLocation] = useState(false);
  const [viewMode, setViewMode] = useState<"radar" | "map">("radar");

  const config = MODES[mode];

  // ─── Data Loading ───────────────────────────────────────

  const loadSignals = useCallback(async () => {
    if (!lat || !lng) return;
    setLoading(true);
    setScanning(true);

    const radius = config.radius;
    const all: RadarSignal[] = [];

    try {
      // Items (listings + services) via RPC
      if (activeTypes.has("listing") || activeTypes.has("service")) {
        const { data: items } = await supabase.rpc("search_nearby_items", {
          _lat: lat, _lng: lng, _radius_km: radius, _item_type: null,
        });
        if (items) {
          (items as any[]).forEach(item => {
            all.push({
              id: item.item_id,
              type: item.item_type === "real_estate" ? "listing" : "service",
              title: item.title,
              subtitle: item.provider_name || item.category,
              photo: item.photo_url,
              lat: item.lat, lng: item.lng,
              distance_km: item.distance_km,
              price: item.price, currency: item.currency,
              category: item.category, status: item.status,
            });
          });
        }
      }

      // Users via presence table
      if (activeTypes.has("user")) {
        const q = supabase
          .from("user_presence")
          .select("user_id, display_name, avatar_url, status, professional_category, verified, lat, lng")
          .eq("visible_on_nearby", true)
          .eq("location_sharing", true)
          .not("lat", "is", null)
          .not("lng", "is", null)
          .neq("user_id", user?.id || "");

        if (mode === "business") {
          q.not("professional_category", "is", null);
        }

        const { data: users } = await q;
        if (users) {
          (users as any[]).forEach(u => {
            const dist = haversine(lat, lng, u.lat, u.lng);
            if (dist <= radius) {
              all.push({
                id: u.user_id, type: "user",
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

      all.sort((a, b) => a.distance_km - b.distance_km);
      setSignals(all);
    } catch (err) {
      console.error("[Radar] Scan failed:", err);
    }

    setLoading(false);
    setTimeout(() => setScanning(false), 1500);
  }, [lat, lng, mode, config.radius, activeTypes, user?.id]);

  // Reload on position change or mode change
  useEffect(() => {
    if (!lat || !lng) return;
    loadSignals();
    const poll = setInterval(loadSignals, 15000);
    return () => clearInterval(poll);
  }, [loadSignals, lat, lng]);

  // Realtime: re-scan when marketplace or user_presence changes
  useEffect(() => {
    if (!lat || !lng) return;
    const channel = supabase
      .channel("radar-live-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_services" }, () => {
        loadSignals();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        loadSignals();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lat, lng, loadSignals]);

  // Auto-request location
  useEffect(() => {
    if (!lat && !lng && !geoLoading && !geoError) requestLocation();
  }, [lat, lng, geoLoading, geoError, requestLocation]);

  // Update own presence with live GPS
  useEffect(() => {
    if (!lat || !lng || !user?.id || invisibleMode) return;
    const updateLoc = () => {
      supabase.from("user_presence").update({
        lat: approxLocation ? Math.round(lat * 100) / 100 : lat,
        lng: approxLocation ? Math.round(lng * 100) / 100 : lng,
        location_sharing: true,
        visible_on_nearby: !invisibleMode,
      } as any).eq("user_id", user.id).then(() => {});
    };
    updateLoc();
    const interval = setInterval(updateLoc, 30000);
    return () => clearInterval(interval);
  }, [lat, lng, user?.id, invisibleMode, approxLocation]);

  // Filter
  const filtered = signals.filter(s => {
    if (!activeTypes.has(s.type)) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) || (s.subtitle || "").toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q);
    }
    return true;
  });

  // ─── Radar SVG Layout ──────────────────────────────────

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 130;

  const signalToPos = (s: RadarSignal) => {
    const norm = Math.min(s.distance_km / config.radius, 1);
    const r = norm * maxR;
    const bearing = getBearing(lat!, lng!, s.lat, s.lng);
    const rad = (bearing - 90) * Math.PI / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  };

  // ─── No Location ──────────────────────────────────────

  if (!lat || !lng) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ background: "hsl(var(--hud-bg))" }}>
        <div className="relative w-36 h-36 mb-4">
          <svg viewBox="0 0 160 160" className="w-full h-full">
            {[60, 45, 30, 15].map((r, i) => (
              <circle key={i} cx="80" cy="80" r={r} fill="none"
                stroke="hsl(var(--hud-cyan))" strokeWidth="0.5"
                opacity={0.06 + i * 0.03} strokeDasharray={i < 2 ? "2 6" : "none"} />
            ))}
            <circle cx="80" cy="80" r="3" fill="hsl(var(--hud-cyan))" opacity="0.6">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
            {geoLoading && (
              <g>
                <animateTransform attributeName="transform" type="rotate" from="0 80 80" to="360 80 80" dur="2s" repeatCount="indefinite" />
                <line x1="80" y1="80" x2="140" y2="80" stroke="hsl(var(--hud-cyan))" strokeWidth="1" opacity="0.25" />
                <path d="M 80 80 L 140 80 A 60 60 0 0 1 131.96 110 Z" fill="hsl(var(--hud-cyan))" opacity="0.05" />
              </g>
            )}
          </svg>
        </div>
        {geoError ? (
          <>
            <p className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--hud-text))" }}>Location Required</p>
            <p className="text-[11px] text-center mb-4 max-w-[240px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{geoError}</p>
            <Button size="sm" onClick={() => { requestLocation(); haptic("medium"); }} className="gap-1.5"
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              <Navigation className="h-3.5 w-3.5" /> Enable Location
            </Button>
          </>
        ) : (
          <>
            <div className="relative w-12 h-12 mb-3">
              <div className="absolute inset-0 rounded-full" style={{ border: "2px solid hsl(var(--hud-cyan) / 0.15)", borderTopColor: "hsl(var(--hud-cyan))" }}>
                <svg className="w-full h-full animate-spin" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="none" stroke="transparent" /></svg>
              </div>
              <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid hsl(var(--hud-cyan) / 0.15)", borderTopColor: "hsl(var(--hud-cyan))", animationDuration: "1.2s" }} />
              <div className="absolute rounded-full animate-spin" style={{ top: 10, left: 10, width: 28, height: 28, border: "2px solid hsl(var(--hud-cyan) / 0.08)", borderBottomColor: "hsl(var(--hud-cyan) / 0.5)", animationDirection: "reverse", animationDuration: "0.9s" }} />
            </div>
            <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Acquiring position…</p>
          </>
        )}
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>

      {/* ═══ Mode Selector ═══ */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <div className="flex gap-1 rounded-xl p-1 overflow-x-auto scrollbar-none" style={{
          background: "hsl(var(--hud-surface))",
          border: "1px solid hsl(var(--hud-border) / 0.08)",
        }}>
          {(Object.keys(MODES) as RadarMode[]).map(m => {
            const cfg = MODES[m];
            const Icon = cfg.icon;
            const active = mode === m;
            return (
              <button key={m}
                onClick={() => { setMode(m); haptic("selection"); }}
                className="flex-1 flex flex-col items-center py-2 px-2 rounded-lg transition-all min-w-[60px] shrink-0"
                style={{
                  background: active ? "hsl(var(--hud-cyan) / 0.1)" : "transparent",
                  color: active ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
                }}>
                <Icon className="h-4 w-4 mb-0.5 shrink-0" />
                <span className="text-[10px] font-semibold whitespace-nowrap leading-tight">{cfg.label}</span>
                <span className="text-[7px] whitespace-nowrap leading-tight mt-0.5 opacity-60">{cfg.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Controls ═══ */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="pl-7 h-7 text-[11px] border-0 rounded-lg"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
        </div>
        {/* Radar / Map toggle */}
        <button onClick={() => { setViewMode(viewMode === "radar" ? "map" : "radar"); haptic("light"); }}
          className="h-7 px-2 rounded-lg flex items-center justify-center gap-1 shrink-0 text-[9px] font-semibold"
          style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-cyan))" }}>
          {viewMode === "radar" ? <><MapPin className="h-3 w-3" /> Map</> : <><Radar className="h-3 w-3" /> Radar</>}
        </button>
        <button onClick={() => { setShowFilters(!showFilters); haptic("light"); }}
          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "hsl(var(--hud-surface))", color: showFilters ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
          <Filter className="h-3 w-3" />
        </button>
        <button onClick={() => { setShowPrivacy(true); haptic("light"); }}
          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "hsl(var(--hud-surface))", color: invisibleMode ? "hsl(var(--hud-warning))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
          {invisibleMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>

      {/* Filter chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-3 pb-1">
            <div className="flex flex-wrap gap-1">
              {(["user", "listing", "service", "activity"] as const).map(t => {
                const Icon = SIGNAL_ICONS[t];
                const active = activeTypes.has(t);
                const col = `hsl(${SIGNAL_COLORS[t]})`;
                return (
                  <button key={t}
                    onClick={() => {
                      const next = new Set(activeTypes);
                      if (active) next.delete(t); else next.add(t);
                      setActiveTypes(next); haptic("light");
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all"
                    style={{
                      background: active ? `${col}15` : "hsl(var(--hud-surface))",
                      color: active ? col : "hsl(var(--hud-text-dim) / 0.4)",
                      border: `1px solid ${active ? `${col}30` : "hsl(var(--hud-border) / 0.08)"}`,
                    }}>
                    <Icon className="h-2.5 w-2.5" />
                    {t.charAt(0).toUpperCase() + t.slice(1)}s
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Visualization: Radar or Map ═══ */}
      {viewMode === "map" ? (
        <div className="flex-shrink-0 px-3 py-2" style={{ height: 320 }}>
          <div className="rounded-xl overflow-hidden h-full" style={{ border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
            <NearbyLeafletMap
              lat={lat!}
              lng={lng!}
              radius={config.radius}
              users={filtered.filter(s => s.type === "user").map(s => ({
                user_id: s.id,
                display_name: s.title,
                avatar_url: s.photo || null,
                status: s.online ? "online" : "offline",
                lat: s.lat,
                lng: s.lng,
                distance_km: s.distance_km,
                professional_category: s.category || null,
              }))}
              items={filtered.filter(s => s.type !== "user").map(s => ({
                item_id: s.id,
                item_type: s.type === "listing" ? "real_estate" : s.type === "service" ? "concierge" : "activity",
                title: s.title,
                lat: s.lat,
                lng: s.lng,
                distance_km: s.distance_km,
                price: s.price || 0,
                currency: s.currency || "EUR",
                provider_name: s.subtitle || null,
              }))}
              onRefresh={loadSignals}
            />
          </div>
          <div className="flex items-center justify-between mt-1 px-1">
            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "hsl(var(--hud-cyan) / 0.4)" }}>
              {config.label} · {filtered.length} signals
            </span>
            <button onClick={() => { loadSignals(); haptic("medium"); }}
              className="text-[8px] font-mono uppercase flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(var(--hud-cyan) / 0.08)", color: "hsl(var(--hud-cyan))" }}>
              <RefreshCw className={`h-2 w-2 ${scanning ? "animate-spin" : ""}`} /> Scan
            </button>
          </div>
        </div>
      ) : (
      <div className="flex-shrink-0 flex items-center justify-center px-4 py-2">
        <div className="relative" style={{ width: size, height: size, maxWidth: "100%" }}>
          <svg viewBox={`-10 -10 ${size + 20} ${size + 20}`} className="w-full h-full" style={{ overflow: "visible" }}>
            <defs>
              <filter id="rGlow"><feGaussianBlur stdDeviation="2.5" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <linearGradient id="sweepG" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--hud-cyan))" stopOpacity="0" />
                <stop offset="60%" stopColor="hsl(var(--hud-cyan))" stopOpacity="0.04" />
                <stop offset="100%" stopColor="hsl(var(--hud-cyan))" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Range rings */}
            {[0.25, 0.5, 0.75, 1].map((f, i) => (
              <circle key={i} cx={cx} cy={cy} r={maxR * f} fill="none"
                stroke="hsl(var(--hud-cyan))" strokeWidth="0.4"
                opacity={0.06 + i * 0.02} strokeDasharray={i < 2 ? "1.5 5" : "none"} />
            ))}

            {/* Crosshairs */}
            {[0, 90].map(a => {
              const rad = (a * Math.PI) / 180;
              return <line key={a} x1={cx - Math.cos(rad) * maxR} y1={cy - Math.sin(rad) * maxR}
                x2={cx + Math.cos(rad) * maxR} y2={cy + Math.sin(rad) * maxR}
                stroke="hsl(var(--hud-cyan))" strokeWidth="0.25" opacity="0.06" />;
            })}

            {/* Sweep */}
            <g filter="url(#rGlow)">
              <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                  dur={scanning ? "1.8s" : "4s"} repeatCount="indefinite" />
                <path d={`M ${cx} ${cy} L ${cx + maxR} ${cy} A ${maxR} ${maxR} 0 0 1 ${cx + maxR * Math.cos(Math.PI / 6)} ${cy + maxR * Math.sin(Math.PI / 6)} Z`}
                  fill="url(#sweepG)" opacity="0.7" />
                <line x1={cx} y1={cy} x2={cx + maxR} y2={cy}
                  stroke="hsl(var(--hud-cyan))" strokeWidth="0.8" opacity="0.2" />
              </g>
            </g>

            {/* Center (you) */}
            <circle cx={cx} cy={cy} r="3.5" fill="hsl(var(--hud-cyan))" filter="url(#rGlow)">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r="7" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.4" opacity="0.25">
              <animate attributeName="r" values="7;14;7" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.25;0;0.25" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Signal markers */}
            {filtered.slice(0, 40).map((s, idx) => {
              const pos = signalToPos(s);
              const col = `hsl(${SIGNAL_COLORS[s.type]})`;
              const r = s.type === "user" ? 4.5 : 3.5;
              return (
                <g key={s.id} className="cursor-pointer" onClick={() => { setSelected(s); haptic("light"); }}>
                  <circle cx={pos.x} cy={pos.y} r={r} fill="none" stroke={col} strokeWidth="0.4" opacity="0">
                    <animate attributeName="r" values={`${r};${r + 5};${r}`} dur={`${2 + idx * 0.1}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur={`${2 + idx * 0.1}s`} repeatCount="indefinite" />
                  </circle>
                  <circle cx={pos.x} cy={pos.y} r={r} fill={col} opacity="0.85" filter="url(#rGlow)" />
                  {s.online && (
                    <circle cx={pos.x + r - 1} cy={pos.y - r + 1} r="1.5"
                      fill="hsl(var(--hud-success))" stroke="hsl(var(--hud-bg))" strokeWidth="0.4" />
                  )}
                </g>
              );
            })}

            {/* Range labels */}
            {[0.5, 1].map(f => (
              <text key={f} x={cx + 3} y={cy - maxR * f + 3}
                fill="hsl(var(--hud-text-dim))" opacity="0.2" fontSize="6" fontFamily="monospace">
                {(config.radius * f).toFixed(config.radius < 1 ? 1 : 0)}km
              </text>
            ))}
          </svg>

          {/* Stats overlay */}
          <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "hsl(var(--hud-cyan) / 0.4)" }}>
              {config.label} · {filtered.length} signals
            </span>
            <button onClick={() => { loadSignals(); haptic("medium"); }}
              className="text-[8px] font-mono uppercase flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(var(--hud-cyan) / 0.08)", color: "hsl(var(--hud-cyan))" }}>
              <RefreshCw className={`h-2 w-2 ${scanning ? "animate-spin" : ""}`} /> Scan
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ═══ Results List ═══ */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
        <div className="space-y-1">
          {filtered.slice(0, 30).map(s => (
            <SignalRow key={s.id} signal={s}
              onSelect={() => { setSelected(s); haptic("light"); }}
              onMessage={() => {
                haptic("medium");
                navigate(`/dashboard/communication?section=chats&search=${encodeURIComponent(s.title)}`);
              }}
            />
          ))}
          {filtered.length === 0 && !loading && (
            <p className="text-center text-[11px] py-6" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
              No signals in range
            </p>
          )}
        </div>
      </div>

      {/* ═══ Preview Card ═══ */}
      <AnimatePresence>
        {selected && (
          <SignalPreview signal={selected}
            onClose={() => setSelected(null)}
            onMessage={() => {
              haptic("medium");
              navigate(`/dashboard/communication?section=chats&search=${encodeURIComponent(selected.title)}`);
              setSelected(null);
            }}
            onCall={() => {
              haptic("medium");
              navigate(`/dashboard/communication?section=calls`);
              setSelected(null);
            }}
            onOpen={() => {
              haptic("medium");
              if (selected.type === "listing" || selected.type === "service") navigate(`/explore`);
              else navigate(`/dashboard/communication?section=contacts`);
              setSelected(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ═══ Privacy Dialog ═══ */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-sm" style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
              <Eye className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Radar Privacy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <PrivacyRow label="Invisible Mode" desc="Hide from all radar scans" checked={invisibleMode} onChange={v => { setInvisibleMode(v); haptic("light"); }} />
            <PrivacyRow label="Approximate Location" desc="Share city-level only" checked={approxLocation} onChange={v => { setApproxLocation(v); haptic("light"); }} />
            <PrivacyRow label="Business Visible" desc="Appear on Business radar" checked={!invisibleMode} onChange={v => { setInvisibleMode(!v); haptic("light"); }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub Components ────────────────────────────────────────

function SignalRow({ signal: s, onSelect, onMessage }: { signal: RadarSignal; onSelect: () => void; onMessage: () => void }) {
  const Icon = SIGNAL_ICONS[s.type];
  const col = `hsl(${SIGNAL_COLORS[s.type]})`;

  return (
    <button onClick={onSelect}
      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors hover:bg-[hsl(var(--hud-surface)/0.5)]"
      style={{ background: "hsl(var(--hud-surface) / 0.15)" }}>
      {s.photo ? (
        <img src={s.photo} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${col}10`, border: `1px solid ${col}20` }}>
          <Icon className="h-4 w-4" style={{ color: col }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{s.title}</p>
          {s.verified && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />}
          {s.online && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--hud-success))" }} />}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{fmtDist(s.distance_km)}</span>
          {s.price != null && (
            <span className="text-[9px] font-medium" style={{ color: col }}>
              {s.price > 1000 ? `${(s.price / 1000).toFixed(0)}k` : s.price} {s.currency}
            </span>
          )}
          {s.category && <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{s.category}</span>}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onMessage(); }}
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "hsl(var(--hud-cyan) / 0.08)", color: "hsl(var(--hud-cyan))" }}>
        <MessageCircle className="h-3 w-3" />
      </button>
    </button>
  );
}

function SignalPreview({ signal: s, onClose, onMessage, onCall, onOpen }: {
  signal: RadarSignal; onClose: () => void; onMessage: () => void; onCall: () => void; onOpen: () => void;
}) {
  const Icon = SIGNAL_ICONS[s.type];
  const col = `hsl(${SIGNAL_COLORS[s.type]})`;

  return (
    <motion.div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-5 safe-area-pb"
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}>
      <div className="rounded-2xl overflow-hidden" style={{
        background: "hsl(var(--hud-surface))",
        border: "1px solid hsl(var(--hud-border) / 0.15)",
        boxShadow: "0 -6px 30px hsl(0 0% 0% / 0.4)",
      }}>
        {/* Header */}
        <div className="p-3 flex items-start gap-3">
          {s.photo ? (
            <img src={s.photo} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${col}10`, border: `1px solid ${col}20` }}>
              <Icon className="h-5 w-5" style={{ color: col }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold truncate" style={{ color: "hsl(var(--hud-text))" }}>{s.title}</h3>
              {s.verified && <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />}
              {s.online && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "hsl(var(--hud-success))" }} />}
            </div>
            {s.subtitle && <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim))" }}>{s.subtitle}</p>}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-4" style={{ borderColor: `${col}25`, color: col }}>
                {s.type}
              </Badge>
              <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{fmtDist(s.distance_km)}</span>
              {s.price != null && <span className="text-[11px] font-semibold" style={{ color: col }}>{s.price.toLocaleString()} {s.currency}</span>}
            </div>
          </div>
          <button onClick={onClose} className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--hud-surface-2))" }}>
            <X className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim))" }} />
          </button>
        </div>

        {/* Actions */}
        <div className="px-3 pb-3 flex gap-1.5">
          <ActionBtn icon={MessageCircle} label="Message" onClick={onMessage} color="hsl(var(--hud-cyan))" />
          <ActionBtn icon={Phone} label="Call" onClick={onCall} color="hsl(var(--hud-success))" />
          <ActionBtn icon={ExternalLink} label="Open" onClick={onOpen} color="hsl(var(--hud-purple))" />
        </div>
      </div>
    </motion.div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, color }: { icon: typeof MessageCircle; label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-medium active:scale-95 transition-transform"
      style={{ background: `${color}10`, color, border: `1px solid ${color}18` }}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function PrivacyRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium" style={{ color: "hsl(var(--hud-text))" }}>{label}</p>
        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{desc}</p>
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

function fmtDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
