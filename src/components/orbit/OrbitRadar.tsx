/**
 * OrbitRadar — Living Ecosystem Discovery Engine.
 *
 * Unified map showing ALL ecosystem entities in real-time:
 * agents, technicians, deliveries, visits, interventions,
 * available properties, releasing soon, scheduled visits,
 * renovations, back on market, services, concierge, people.
 *
 * Features:
 * - Premium dark Leaflet map with animated markers
 * - Category-based filtering with smart pills
 * - Distance/radius control
 * - Privacy controls
 * - Search across all entities
 * - Signal detail preview cards
 * - SVG radar scan animation (toggle)
 */
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar, MapPin, Navigation, Globe2, Building2,
  MessageCircle, Phone, Eye, ExternalLink, X, Search,
  EyeOff, Crosshair, RefreshCw, ChevronDown,
  Map, List, Shield,
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
import {
  useEcosystemRadar,
  ECOSYSTEM_CATEGORIES,
  type EcosystemEntity,
  type EcosystemFilter,
} from "@/hooks/useEcosystemRadar";

const LiveEcosystemMap = lazy(() => import("./LiveEcosystemMap"));

// ─── Helper: resolve category color to hsl() string ────────
/** cat.color is a CSS custom property name like "--hud-cyan" */
function catHsl(color: string, alpha?: number): string {
  if (alpha !== undefined) return `hsl(var(${color}) / ${alpha})`;
  return `hsl(var(${color}))`;
}

// ─── Radius options ────────────────────────────────────────

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200];

// ─── Main Component ────────────────────────────────────────

export default function OrbitRadar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lat, lng, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  const [radius, setRadius] = useState(25);
  const [filter, setFilter] = useState<EcosystemFilter>("all");
  const [search, setSearch] = useState("");
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<EcosystemEntity | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [invisibleMode, setInvisibleMode] = useState(false);
  const [approxLocation, setApproxLocation] = useState(false);

  const { entities, loading, scanning, scan, counts } = useEcosystemRadar({
    lat, lng, radius, userId: user?.id, filter, search, onlyAvailable, onlyVerified,
  });

  // Auto-request location
  useEffect(() => {
    if (!lat && !lng && !geoLoading && !geoError) requestLocation();
  }, [lat, lng, geoLoading, geoError, requestLocation]);

  // Update own presence
  useEffect(() => {
    if (!lat || !lng || !user?.id || invisibleMode) return;
    const update = () => {
      supabase.from("user_presence").update({
        lat: approxLocation ? Math.round(lat * 100) / 100 : lat,
        lng: approxLocation ? Math.round(lng * 100) / 100 : lng,
        location_sharing: true,
        visible_on_nearby: !invisibleMode,
      } as any).eq("user_id", user.id).then(() => {});
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [lat, lng, user?.id, invisibleMode, approxLocation]);

  // Handle entity selection from map
  const handleSelect = useCallback((entity: EcosystemEntity) => {
    setSelected(entity);
    haptic("light");
  }, []);

  // ─── No Location ──────────────────────────────────────────

  if (!lat || !lng) {
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
        {geoError ? (
          <>
            <p className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--hud-text))" }}>Localisation requise</p>
            <p className="text-[11px] text-center mb-4 max-w-[240px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{geoError}</p>
            <Button size="sm" onClick={() => { requestLocation(); haptic("medium"); }} className="gap-1.5"
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              <Navigation className="h-3.5 w-3.5" /> Activer la localisation
            </Button>
          </>
        ) : (
          <>
            <div className="relative w-12 h-12 mb-3">
              <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid hsl(var(--hud-cyan) / 0.15)", borderTopColor: "hsl(var(--hud-cyan))", animationDuration: "1.2s" }} />
            </div>
            <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Acquisition de la position…</p>
          </>
        )}
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>

      {/* ═══ Header ═══ */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radar className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
              {scanning && (
                <motion.div className="absolute inset-0 rounded-full" style={{ border: "2px solid hsl(var(--hud-cyan))" }}
                  initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }} />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight" style={{ color: "hsl(var(--hud-text))" }}>Living Ecosystem</h2>
              <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {entities.length} signaux · {radius}km
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Radius */}
            <div className="relative">
              <button onClick={() => { setShowRadiusMenu(!showRadiusMenu); haptic("light"); }}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))", border: "1px solid hsl(var(--hud-cyan) / 0.2)" }}>
                <MapPin className="h-3 w-3" /> {radius}km <ChevronDown className="h-2.5 w-2.5" />
              </button>
              <AnimatePresence>
                {showRadiusMenu && (
                  <motion.div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 min-w-[80px]"
                    style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)" }}
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                    {RADIUS_OPTIONS.map(r => (
                      <button key={r} onClick={() => { setRadius(r); setShowRadiusMenu(false); haptic("selection"); }}
                        className="w-full px-3 py-2 text-left text-xs transition-colors"
                        style={{
                          color: radius === r ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text))",
                          fontWeight: radius === r ? 600 : 400,
                          background: radius === r ? "hsl(var(--hud-cyan) / 0.08)" : "transparent",
                        }}>
                        {r} km
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Privacy */}
            <button onClick={() => { setShowPrivacy(true); haptic("light"); }}
              className="h-7 w-7 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--hud-surface) / 0.5)", color: invisibleMode ? "hsl(var(--hud-warning))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
              {invisibleMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher agents, biens, services…"
            className="pl-8 h-8 text-[11px] border-0 rounded-xl"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
        </div>

        {/* Category pills (scrollable) */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1" style={{ WebkitOverflowScrolling: "touch" }}>
          {ECOSYSTEM_CATEGORIES.map(cat => {
            const active = filter === cat.id;
            const count = cat.id === "all" ? entities.length : (counts[cat.id] || 0);
            return (
              <button key={cat.id}
                onClick={() => { setFilter(cat.id); haptic("selection"); }}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all"
                style={{
                  background: active ? catHsl(cat.color, 0.12) : "hsl(var(--hud-surface) / 0.4)",
                  color: active ? catHsl(cat.color) : "hsl(var(--hud-text-dim) / 0.5)",
                  border: `1px solid ${active ? catHsl(cat.color, 0.25) : "transparent"}`,
                  transform: active ? "scale(1.04)" : "scale(1)",
                }}>
                <span className="text-xs">{cat.emoji}</span>
                {cat.label}
                {count > 0 && <span className="opacity-50 text-[9px]">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Quick toggles + view mode */}
        <div className="flex items-center gap-2 mt-1.5 px-0.5">
          <button onClick={() => { setOnlyAvailable(!onlyAvailable); haptic("light"); }}
            className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: onlyAvailable ? "hsl(var(--hud-success) / 0.12)" : "transparent",
              color: onlyAvailable ? "hsl(var(--hud-success))" : "hsl(var(--hud-text-dim) / 0.4)",
              border: `1px solid ${onlyAvailable ? "hsl(var(--hud-success) / 0.2)" : "hsl(var(--hud-border) / 0.08)"}`,
            }}>
            🟢 Dispo
          </button>
          <button onClick={() => { setOnlyVerified(!onlyVerified); haptic("light"); }}
            className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: onlyVerified ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: onlyVerified ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
              border: `1px solid ${onlyVerified ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.08)"}`,
            }}>
            ✅ Vérifié
          </button>

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid hsl(var(--hud-border) / 0.12)" }}>
            <button onClick={() => { setViewMode("map"); haptic("selection"); }}
              className="px-2 py-0.5 flex items-center gap-0.5 text-[9px]"
              style={{
                background: viewMode === "map" ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface) / 0.3)",
                color: viewMode === "map" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>
              <Map className="h-2.5 w-2.5" /> Carte
            </button>
            <button onClick={() => { setViewMode("list"); haptic("selection"); }}
              className="px-2 py-0.5 flex items-center gap-0.5 text-[9px]"
              style={{
                background: viewMode === "list" ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface) / 0.3)",
                color: viewMode === "list" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>
              <List className="h-2.5 w-2.5" /> Liste
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Map or List View ═══ */}
      {viewMode === "map" ? (
        <div className="flex-1 relative min-h-0">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full" style={{ background: "hsl(var(--hud-bg))" }}>
              <Radar className="h-8 w-8 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
            </div>
          }>
            <LiveEcosystemMap
              lat={lat}
              lng={lng}
              radius={radius}
              entities={entities.filter(e => !e.meta?.no_geo)}
              onSelect={handleSelect}
            />
          </Suspense>

          {/* Category legend overlay */}
          <div className="absolute top-2 left-2 right-14 flex flex-wrap gap-1 z-[1000] pointer-events-none">
            {Object.entries(counts).slice(0, 5).map(([cat, count]) => {
              const cfg = ECOSYSTEM_CATEGORIES.find(c => c.id === cat);
              if (!cfg) return null;
              return (
                <div key={cat} className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold backdrop-blur-md pointer-events-auto"
                  style={{ background: "hsl(var(--hud-bg) / 0.85)", color: catHsl(cfg.color), border: `1px solid ${catHsl(cfg.color, 0.2)}` }}>
                  {cfg.emoji} {count}
                </div>
              );
            })}
          </div>

          {/* Floating scan button */}
          <div className="absolute bottom-4 right-4 z-[1000]">
            <motion.button onClick={() => { scan(); haptic("medium"); }}
              className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ background: "hsl(var(--hud-bg) / 0.9)", border: "1px solid hsl(var(--hud-cyan) / 0.3)", boxShadow: "0 4px 20px hsl(0 0% 0% / 0.3)" }}
              whileTap={{ scale: 0.9 }}>
              <Radar className={`h-5 w-5 ${scanning ? "animate-spin" : ""}`} style={{ color: "hsl(var(--hud-cyan))" }} />
            </motion.button>
          </div>

          {/* Recenter */}
          <div className="absolute bottom-4 left-4 z-[1000]">
            <button onClick={() => { requestLocation(); haptic("light"); }}
              className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ background: "hsl(var(--hud-bg) / 0.9)", border: "1px solid hsl(var(--hud-border) / 0.2)" }}>
              <Navigation className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
            </button>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
          {loading && entities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Radar className="h-10 w-10 animate-spin mb-3" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Scan de l'écosystème…</p>
            </div>
          ) : entities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Radar className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
              <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Aucun signal à portée</p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Augmentez le rayon ou changez les filtres</p>
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {entities.slice(0, 50).map((entity) => (
                <EntityRow key={entity.id + entity.category} entity={entity}
                  onSelect={() => handleSelect(entity)}
                  onMessage={() => {
                    haptic("medium");
                    navigate(`/dashboard/communication?section=chats&search=${encodeURIComponent(entity.title)}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Preview Card ═══ */}
      <AnimatePresence>
        {selected && (
          <EntityPreview entity={selected}
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
              if (["service", "concierge", "available_property", "back_on_market"].includes(selected.category)) {
                navigate(`/explore`);
              } else {
                navigate(`/dashboard/communication?section=contacts`);
              }
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
              <Shield className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Confidentialité
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <PrivacyRow label="Mode invisible" desc="Masquer votre présence du radar" checked={invisibleMode} onChange={v => { setInvisibleMode(v); haptic("light"); }} />
            <PrivacyRow label="Position approx." desc="Partager uniquement la ville" checked={approxLocation} onChange={v => { setApproxLocation(v); haptic("light"); }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub Components ────────────────────────────────────────

function EntityRow({ entity, onSelect, onMessage }: {
  entity: EcosystemEntity; onSelect: () => void; onMessage: () => void;
}) {
  const cfg = ECOSYSTEM_CATEGORIES.find(c => c.id === entity.category);
  const colorVar = cfg?.color || "--hud-cyan";
  const emoji = cfg?.emoji || "📍";

  const distStr = entity.distance_km < 1
    ? `${Math.round(entity.distance_km * 1000)}m`
    : `${entity.distance_km.toFixed(1)}km`;

  return (
    <button onClick={onSelect}
      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors"
      style={{ background: "hsl(var(--hud-surface) / 0.12)" }}>
      {/* Icon */}
      {entity.photo ? (
        <img src={entity.photo} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base"
          style={{ background: catHsl(colorVar, 0.06), border: `1px solid ${catHsl(colorVar, 0.12)}` }}>
          {emoji}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{entity.title}</span>
          {entity.verified && <span className="text-[8px]">✅</span>}
          {entity.online && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--hud-success))" }} />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: catHsl(colorVar, 0.08), color: catHsl(colorVar) }}>{cfg?.label || entity.category}</span>
          <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{distStr}</span>
          {entity.price != null && entity.price > 0 && (
            <span className="text-[9px] font-medium" style={{ color: catHsl(colorVar) }}>
              {entity.price > 1000 ? `${(entity.price / 1000).toFixed(0)}k` : entity.price} {entity.currency}
            </span>
          )}
        </div>
        {entity.subtitle && (
          <p className="text-[9px] line-clamp-2 break-words mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{entity.subtitle}</p>
        )}
      </div>
      <button onClick={e => { e.stopPropagation(); onMessage(); }}
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "hsl(var(--hud-cyan) / 0.08)", color: "hsl(var(--hud-cyan))" }}>
        <MessageCircle className="h-3.5 w-3.5" />
      </button>
    </button>
  );
}

function EntityPreview({ entity, onClose, onMessage, onCall, onOpen }: {
  entity: EcosystemEntity; onClose: () => void; onMessage: () => void; onCall: () => void; onOpen: () => void;
}) {
  const cfg = ECOSYSTEM_CATEGORIES.find(c => c.id === entity.category);
  const colorVar = cfg?.color || "--hud-cyan";
  const emoji = cfg?.emoji || "📍";
  const distStr = entity.distance_km < 1
    ? `${Math.round(entity.distance_km * 1000)}m`
    : `${entity.distance_km.toFixed(1)}km`;

  return (
    <motion.div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-5 safe-area-pb"
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}>
      <div className="rounded-2xl overflow-hidden" style={{
        background: "hsl(var(--hud-surface))",
        border: "1px solid hsl(var(--hud-border) / 0.15)",
        boxShadow: "0 -6px 30px hsl(0 0% 0% / 0.4)",
      }}>
        <div className="p-3 flex items-start gap-3">
          {entity.photo ? (
            <img src={entity.photo} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg"
              style={{ background: catHsl(colorVar, 0.06), border: `1px solid ${catHsl(colorVar, 0.12)}` }}>
              {emoji}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold break-words" style={{ color: "hsl(var(--hud-text))" }}>{entity.title}</h3>
              {entity.verified && <span className="text-[10px]">✅</span>}
              {entity.online && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "hsl(var(--hud-success))" }} />}
            </div>
            {entity.subtitle && <p className="text-[11px] mt-0.5 break-words" style={{ color: "hsl(var(--hud-text-dim))" }}>{entity.subtitle}</p>}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4" style={{ borderColor: catHsl(colorVar, 0.2), color: catHsl(colorVar) }}>{cfg?.label || entity.category}</Badge>
              <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{distStr}</span>
              {entity.price != null && entity.price > 0 && (
                <span className="text-[11px] font-semibold" style={{ color: catHsl(colorVar) }}>{entity.price.toLocaleString()} {entity.currency}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--hud-surface-2))" }}>
            <X className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim))" }} />
          </button>
        </div>

        <div className="px-3 pb-3 flex gap-1.5">
          <ActionBtn icon={MessageCircle} label="Message" onClick={onMessage} colorVar="--hud-cyan" />
          <ActionBtn icon={Phone} label="Appel" onClick={onCall} colorVar="--hud-success" />
          <ActionBtn icon={ExternalLink} label="Ouvrir" onClick={onOpen} colorVar="--hud-purple" />
        </div>
      </div>
    </motion.div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, colorVar }: {
  icon: typeof MessageCircle; label: string; onClick: () => void; colorVar: string;
}) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-medium active:scale-95 transition-transform"
      style={{ background: catHsl(colorVar, 0.06), color: catHsl(colorVar), border: `1px solid ${catHsl(colorVar, 0.12)}` }}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function PrivacyRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
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
