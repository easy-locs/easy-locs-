/**
 * useRadarFilters — Atomic: filter/sort state for RadarView.
 */
import { useState, useCallback } from "react";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

type RadarSortMode = "smart" | "nearest" | "best_rated" | "trending";

export function useRadarFilters() {
  const [typeFilter, setTypeFilter] = useState<GeoEntity["type"] | "all">("all");
  const [sortMode, setSortMode] = useState<RadarSortMode>("smart");
  const [minRating, setMinRating] = useState(0);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [showPromotedOnly, setShowPromotedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const resetFilters = useCallback(() => {
    setTypeFilter("all");
    setSortMode("smart");
    setMinRating(0);
    setShowOpenOnly(false);
    setShowPromotedOnly(false);
  }, []);

  return {
    typeFilter, setTypeFilter,
    sortMode, setSortMode,
    minRating, setMinRating,
    showOpenOnly, setShowOpenOnly,
    showPromotedOnly, setShowPromotedOnly,
    viewMode, setViewMode,
    showFilters, setShowFilters,
    showSortMenu, setShowSortMenu,
    resetFilters,
  };
}
