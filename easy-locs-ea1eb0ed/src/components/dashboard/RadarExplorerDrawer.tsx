import { memo, useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Map as MapIcon, Search, SlidersHorizontal, ChevronRight, X, Compass, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppBottomSheet } from "@/components/ui/system/AppBottomSheet";
import { useI18n, tSafe } from "@/lib/i18n";
import RadarCardDispatcher from "@/components/radar/cards/RadarCardDispatcher";
import { haptic } from "@/lib/haptics";
import { AppCardTitle } from "@/components/ui/AppText";
import { buildRadarRoute, type EngagementState } from "@/lib/radar/radar-engagement";
import type { RadarVertical, RadarResultItem } from "@/lib/radar/radar-result-item";

const UnifiedMap = lazy(() => import("@/components/map/UnifiedMap"));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSort?: string;
  initialVertical?: string;
  items: RadarResultItem[];
  loading: boolean;
  totalCount: number;
}

const VERTICAL_CHIPS: { key: RadarVertical | "all"; emoji: string; labelKey: string; fallback: string }[] = [
  { key: "all", emoji: "🌐", labelKey: "radar.all", fallback: "All" },
  { key: "food", emoji: "🍽️", labelKey: "radar.food", fallback: "Food" },
  { key: "hotel", emoji: "🏨", labelKey: "radar.hotel", fallback: "Hotels" },
  { key: "property", emoji: "🏠", labelKey: "radar.property", fallback: "Property" },
  { key: "services", emoji: "🔧", labelKey: "radar.services", fallback: "Services" },
  { key: "shops", emoji: "🛍️", labelKey: "radar.shops", fallback: "Shops" },
  { key: "taxi", emoji: "🚗", labelKey: "radar.taxi", fallback: "Taxi" },
  { key: "healthcare", emoji: "🏥", labelKey: "radar.healthcare", fallback: "Health" },
];

const SORT_OPTIONS = [
  { key: "smart", labelKey: "radar.sort_smart", fallback: "Smart" },
  { key: "nearest", labelKey: "radar.sort_nearest", fallback: "Nearest" },
  { key: "best_rated", labelKey: "radar.sort_rating", fallback: "Top Rated" },
  { key: "trending", labelKey: "radar.sort_trending", fallback: "Trending" },
];

function RadarExplorerDrawer({ open, onOpenChange, initialSort, initialVertical, items, loading, totalCount }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [activeVertical, setActiveVertical] = useState<RadarVertical | "all">(
    (initialVertical as RadarVertical) || "all"
  );
  const [activeSort, setActiveSort] = useState(initialSort || "smart");
  const [showMap, setShowMap] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveSort(initialSort || "smart");
      setActiveVertical((initialVertical as RadarVertical) || "all");
      setSelectedItemId(null);
    }
  }, [open, initialSort, initialVertical]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (activeVertical !== "all") {
      result = result.filter((item) => item.type === activeVertical);
    }

    if (activeSort === "nearest") {
      result.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    } else if (activeSort === "best_rated") {
      result.sort((a, b) => (b.ratingValue ?? 0) - (a.ratingValue ?? 0));
    } else if (activeSort === "trending") {
      result.sort((a, b) => b.reviewsCount - a.reviewsCount);
    } else {
      result.sort((a, b) => b.radarScore - a.radarScore);
    }

    return result;
  }, [items, activeVertical, activeSort]);

  const mapEntities = useMemo(
    () =>
      filteredItems.map((item) => ({
        id: item.id,
        type: "shop" as const,
        name: item.title,
        lat: item.lat,
        lng: item.lng,
        rating: item.ratingValue ?? undefined,
        imageUrl: item.image ?? undefined,
        category: item.category,
        slug: item.slug ?? undefined,
        distance: item.distanceKm ?? undefined,
      })),
    [filteredItems]
  );

  const handleTransitionToRadar = useCallback(
    (trigger: string) => {
      haptic("medium");
      const state: EngagementState = {
        level: "full",
        vertical: activeVertical !== "all" ? activeVertical : undefined,
        sort: activeSort !== "smart" ? activeSort : undefined,
      };
      onOpenChange(false);
      setTimeout(() => navigate(buildRadarRoute(state)), 200);
    },
    [activeVertical, activeSort, navigate, onOpenChange]
  );

  const handleSelectItem = useCallback((item: RadarResultItem) => {
    haptic("light");
    setSelectedItemId(item.id);
  }, []);

  const handleNavigateToItem = useCallback(
    (item: RadarResultItem) => {
      haptic("light");
      navigate(item.route);
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  return (
    <AppBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.45, 0.88]}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(226 24% 14%)" }}
            >
              <Compass className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <div>
              <AppCardTitle as="h2" lines={1} className="font-bold leading-tight">
                {tSafe(t, "dashboard.radar_explorer", "Explore Nearby")}
              </AppCardTitle>
              <p className="text-[0.625rem] text-muted-foreground leading-tight">
                {filteredItems.length} {tSafe(t, "dashboard.results_found", "results")}
                {totalCount > 20 && ` · ${totalCount}+ ${tSafe(t, "dashboard.total_available", "total")}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close explorer"
            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--muted) / 0.3)" }}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1" data-no-swipe>
          {VERTICAL_CHIPS.map((chip) => {
            const isActive = activeVertical === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => {
                  haptic("light");
                  setActiveVertical(chip.key);
                }}
                aria-pressed={isActive}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0 transition-all active:scale-95 text-[0.6875rem] font-bold"
                style={{
                  background: isActive ? "hsl(226 24% 14%)" : "hsl(var(--muted) / 0.2)",
                  color: isActive ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.7)",
                  border: `1px solid ${isActive ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border) / 0.1)"}`,
                }}
              >
                <span className="text-xs">{chip.emoji}</span>
                {tSafe(t, chip.labelKey, chip.fallback)}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          {SORT_OPTIONS.map((opt) => {
            const isActive = activeSort === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  haptic("light");
                  setActiveSort(opt.key);
                }}
                aria-pressed={isActive}
                className="text-[0.625rem] font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                style={{
                  background: isActive ? "hsl(var(--accent) / 0.1)" : "transparent",
                  color: isActive ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                }}
              >
                {tSafe(t, opt.labelKey, opt.fallback)}
              </button>
            );
          })}

          <div className="flex-1" />

          <button
            onClick={() => setShowMap((prev) => !prev)}
            aria-pressed={showMap}
            aria-label={showMap ? "Hide map" : "Show map"}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.625rem] font-bold transition-all active:scale-95"
            style={{
              background: showMap ? "hsl(226 24% 14%)" : "hsl(var(--muted) / 0.2)",
              color: showMap ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
            }}
          >
            <MapIcon className="w-3 h-3" />
            {tSafe(t, "dashboard.map", "Map")}
          </button>
        </div>

        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 160, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-xl overflow-hidden mb-3 shrink-0"
              style={{ border: "1px solid hsl(var(--border) / 0.1)" }}
            >
              <Suspense
                fallback={
                  <div className="w-full h-[160px] flex items-center justify-center" style={{ background: "hsl(var(--muted) / 0.15)" }}>
                    <Compass className="w-5 h-5 animate-spin text-muted-foreground/40" />
                  </div>
                }
              >
                <UnifiedMap
                  entities={mapEntities}
                  zoom={13}
                  className="w-full h-[160px]"
                  selectedId={selectedItemId}
                  showUserLocation
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-1.5 pb-4">
          {loading && filteredItems.length === 0 ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{ background: "hsl(var(--muted) / 0.1)" }}>
                  <div className="w-12 h-12 rounded-xl bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(var(--muted) / 0.15)" }}
              >
                <Compass className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                {tSafe(t, "dashboard.no_results_filter", "No results for this filter. Try another category.")}
              </p>
              <button
                onClick={() => setActiveVertical("all")}
                className="text-[0.6875rem] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                style={{ color: "hsl(var(--accent))", background: "hsl(var(--accent) / 0.1)" }}
              >
                {tSafe(t, "dashboard.show_all", "Show all")}
              </button>
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <RadarCardDispatcher
                key={item.id}
                item={item}
                rank={idx + 1}
                selected={selectedItemId === item.id}
                onSelect={() => handleSelectItem(item)}
                onNavigate={() => handleNavigateToItem(item)}
              />
            ))
          )}
        </div>

        <div
          className="shrink-0 pt-3 pb-1 -mx-4 px-4 flex gap-2"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}
        >
          <button
            onClick={() => handleTransitionToRadar("open_map")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:scale-[0.97] transition-transform"
            style={{
              background: "hsl(226 24% 14%)",
              border: "1px solid hsl(var(--accent) / 0.2)",
            }}
          >
            <MapIcon className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
            <span className="text-[0.6875rem] font-bold" style={{ color: "hsl(0 0% 100%)" }}>
              {tSafe(t, "dashboard.open_full_map", "Open Map")}
            </span>
          </button>

          <button
            onClick={() => handleTransitionToRadar("full_search")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:scale-[0.97] transition-transform"
            style={{
              background: "hsl(var(--accent) / 0.1)",
              border: "1px solid hsl(var(--accent) / 0.15)",
            }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
            <span className="text-[0.6875rem] font-bold" style={{ color: "hsl(var(--accent))" }}>
              {tSafe(t, "dashboard.full_search", "Full Search")}
            </span>
          </button>

          <button
            onClick={() => handleTransitionToRadar("explore_zone")}
            aria-label="Explore zone"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl active:scale-[0.97] transition-transform"
            style={{
              background: "hsl(var(--muted) / 0.15)",
              border: "1px solid hsl(var(--border) / 0.1)",
            }}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </AppBottomSheet>
  );
}

export default memo(RadarExplorerDrawer);
