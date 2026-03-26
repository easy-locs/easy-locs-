/**
 * MapPlaceCard — Enriched result card shown after place-discovery selection.
 * Shows: route, distance, ETA, traffic, nearby commerce, actions.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Navigation, ShoppingBag, Car, Truck, ChevronRight,
  Clock, Route, Store, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutePreview } from "@/lib/map/route-preview-engine";
import type { NearbyResult } from "@/lib/map/nearby-discovery-engine";

interface Props {
  placeName: string;
  district?: string;
  city?: string;
  route: RoutePreview | null;
  nearby: NearbyResult | null;
  loading?: boolean;
  onGoThere?: () => void;
  onOrderHere?: () => void;
  onExploreNearby?: () => void;
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
};

export function MapPlaceCard({
  placeName,
  district,
  city,
  route,
  nearby,
  loading,
  onGoThere,
  onOrderHere,
  onExploreNearby,
  onDismiss,
}: Props) {
  const locationSub = [district, city].filter(Boolean).join(", ");
  const categories = nearby ? Object.entries(nearby.categories) : [];

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

      {/* Nearby commerce */}
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
        {onGoThere && (
          <ActionButton
            icon={<Navigation className="w-3.5 h-3.5" />}
            label="Go there"
            onClick={onGoThere}
          />
        )}
        {onOrderHere && nearby && nearby.totalCount > 0 && (
          <ActionButton
            icon={<ShoppingBag className="w-3.5 h-3.5" />}
            label="Order here"
            onClick={onOrderHere}
            primary
          />
        )}
        {onExploreNearby && nearby && nearby.totalCount > 0 && (
          <ActionButton
            icon={<MapPin className="w-3.5 h-3.5" />}
            label="Explore"
            onClick={onExploreNearby}
          />
        )}
      </div>
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
