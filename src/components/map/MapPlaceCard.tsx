/**
 * MapPlaceCard — Enriched result card shown after place-discovery selection.
 * Shows: route, distance, ETA, traffic, nearby commerce, actions.
 * Actions are fully wired: Go There, Order Here, Explore Nearby.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, ShoppingBag, Car,
  Clock, Route, Store, X, ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutePreview } from "@/lib/map/route-preview-engine";
import type { NearbyResult, NearbyMerchant } from "@/lib/map/nearby-discovery-engine";
import { eventBus } from "@/lib/core/event-bus";

interface Props {
  placeName: string;
  district?: string;
  city?: string;
  placeId?: string;
  zoneKey?: string;
  lat?: number;
  lng?: number;
  route: RoutePreview | null;
  nearby: NearbyResult | null;
  loading?: boolean;
  onDismiss?: () => void;
}

const TRAFFIC_COLORS: Record<string, string> = {
  low: "text-green-500",
  moderate: "text-yellow-500",
  heavy: "text-destructive",
  unknown: "text-muted-foreground",
};

const VERTICAL_ICONS: Record<string, string> = {
  food: "🍽️",
  grocery: "🛒",
  pharmacy: "💊",
  services: "🔧",
  beauty: "💅",
  shops: "🛍️",
  stays: "🏨",
  general: "📍",
};

export function MapPlaceCard({
  placeName,
  district,
  city,
  placeId,
  zoneKey,
  lat,
  lng,
  route,
  nearby,
  loading,
  onDismiss,
}: Props) {
  const locationSub = [district, city].filter(Boolean).join(", ");
  const categories = nearby ? Object.entries(nearby.categories) : [];
  const [exploreOpen, setExploreOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // ── Go There: emit route focus event + center map ──
  const handleGoThere = () => {
    if (route) {
      eventBus.emit("map.route.focus" as any, {
        placeId: placeId ?? route.placeId,
        origin: route.origin,
        destination: route.destination,
        geometry: route.routeGeometry,
        zoneKey: zoneKey ?? route.zoneKey,
      });
    } else if (lat != null && lng != null) {
      eventBus.emit("map.center.request" as any, { lat, lng, zoom: 16 });
    }
  };

  // ── Order Here: navigate to nearby deliverable merchants ──
  const handleOrderHere = () => {
    if (!nearby || nearby.merchants.length === 0) return;
    eventBus.emit("place.order.requested" as any, {
      placeId: nearby.placeId,
      zoneKey: nearby.zoneKey ?? zoneKey,
      merchants: nearby.merchants.slice(0, 10).map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        vertical: m.vertical,
        distanceKm: m.distanceKm,
      })),
      totalCount: nearby.totalCount,
    });
  };

  // ── Explore Nearby: toggle expanded merchant list ──
  const handleExploreNearby = () => {
    setExploreOpen((v) => !v);
  };

  // Filtered merchant list for explore
  const filteredMerchants: NearbyMerchant[] = nearby
    ? activeFilter
      ? nearby.merchants.filter((m) => m.vertical === activeFilter)
      : nearby.merchants
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card border border-border/30 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground truncate">{placeName}</h3>
          {locationSub && (
            <p className="text-[11px] text-muted-foreground truncate">{locationSub}</p>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-muted/50 shrink-0 ml-2">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Route info */}
      {loading && (
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Loading route & nearby…</span>
        </div>
      )}

      {!loading && route && (
        <div className="px-4 py-2 flex items-center gap-4 border-t border-border/10">
          <div className="flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{route.distanceFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{route.etaFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Car className={cn("w-3.5 h-3.5", TRAFFIC_COLORS[route.trafficLevel])} />
            <span className={cn("text-xs font-medium capitalize", TRAFFIC_COLORS[route.trafficLevel])}>
              {route.trafficLevel === "unknown" ? "—" : route.trafficLevel}
            </span>
          </div>
        </div>
      )}

      {/* Nearby commerce summary */}
      {!loading && nearby && nearby.totalCount > 0 && (
        <div className="px-4 py-2 border-t border-border/10">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Store className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {nearby.totalCount} nearby
            </span>
            <span className="text-[10px] text-muted-foreground">
              within {nearby.radiusKm < 1 ? `${Math.round(nearby.radiusKm * 1000)}m` : `${nearby.radiusKm}km`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.slice(0, 6).map(([vertical, count]) => (
              <span
                key={vertical}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-[10px] font-medium text-foreground"
              >
                <span>{VERTICAL_ICONS[vertical] ?? "📍"}</span>
                <span className="capitalize">{vertical}</span>
                <span className="text-muted-foreground">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2.5 border-t border-border/10 flex gap-2">
        <ActionButton
          icon={<Navigation className="w-3.5 h-3.5" />}
          label="Go there"
          onClick={handleGoThere}
        />
        {nearby && nearby.totalCount > 0 && (
          <ActionButton
            icon={<ShoppingBag className="w-3.5 h-3.5" />}
            label="Order here"
            onClick={handleOrderHere}
            primary
          />
        )}
        {nearby && nearby.totalCount > 0 && (
          <ActionButton
            icon={exploreOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
            label={exploreOpen ? "Close" : "Explore"}
            onClick={handleExploreNearby}
          />
        )}
      </div>

      {/* Explore Nearby expanded panel */}
      <AnimatePresence>
        {exploreOpen && nearby && nearby.merchants.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/10"
          >
            {/* Category filters */}
            {categories.length > 1 && (
              <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto">
                <Filter className="w-3 h-3 text-muted-foreground shrink-0" />
                <button
                  onClick={() => setActiveFilter(null)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 transition-colors",
                    !activeFilter ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  All
                </button>
                {categories.map(([vertical]) => (
                  <button
                    key={vertical}
                    onClick={() => setActiveFilter(activeFilter === vertical ? null : vertical)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 capitalize transition-colors",
                      activeFilter === vertical ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {VERTICAL_ICONS[vertical] ?? ""} {vertical}
                  </button>
                ))}
              </div>
            )}

            {/* Merchant list */}
            <div className="px-3 py-2 space-y-1 max-h-[200px] overflow-y-auto">
              {filteredMerchants.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No merchants in this category</p>
              )}
              {filteredMerchants.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    eventBus.emit("ENTITY_OPENED", { id: m.id, type: "merchant", source: "map_explore" });
                    // Navigate to merchant storefront
                    window.location.href = `/s/${m.slug}`;
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors text-left"
                >
                  {m.logo_url ? (
                    <img src={m.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                      <span className="text-xs">{VERTICAL_ICONS[m.vertical] ?? "📍"}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate capitalize">
                      {m.vertical} · {m.distanceKm < 1 ? `${Math.round(m.distanceKm * 1000)}m` : `${m.distanceKm.toFixed(1)}km`}
                      {m.rating ? ` · ⭐ ${m.rating}` : ""}
                    </p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/40 rotate-[-90deg] shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-muted/50 text-foreground hover:bg-muted/80"
      )}
    >
      {icon}
      {label}
    </button>
  );
}