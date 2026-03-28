/**
 * RadarPage — Immersive full-screen map-first experience.
 * Premium glass controls + live geocoded place search + pull-up bottom sheet.
 */
import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useRadarGeo } from "@/hooks/useRadarGeo";
import { useRadarStore, type SortMode } from "@/stores/radarStore";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { RadarFilterMenu } from "@/components/radar/RadarFilterMenu";
import { RadarResultsList } from "@/components/radar/RadarResultsList";
import { ultraHaptic } from "@/lib/performance/useUltraFast";
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";
import { fetchCanonicalDiscovery } from "@/lib/discovery/canonical-discovery-pipeline";
import { getTimeContext } from "@/lib/discovery/timeContext";
import { RADAR_CATEGORIES, getSubcategoriesForRadarCategory, type RadarMainCategory } from "@/lib/taxonomy/world-class-taxonomy";
import { searchPlaces, type NormalizedPlace } from "@/lib/location/geocode";
import type { RadarCategory } from "@/lib/radar/types";
import { Search, MapPin, Navigation, Loader2, ArrowLeft, ChevronUp, Layers, X } from "lucide-react";
import "@/styles/radar-pro.css";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

const UnifiedMap = lazy(() => import("@/components/map/UnifiedMap"));

const CATEGORIES = RADAR_CATEGORIES.map((c) => ({
  cat: c.value as RadarCategory,
  icon: c.emoji,
  label: c.label,
}));

const SORT_MODES: { key: SortMode; label: string }[] = [
  { key: "smart", label: "🧠 Smart" },
  { key: "nearest", label: "📍 Near" },
  { key: "best", label: "⭐ Best" },
  { key: "trending", label: "🔥 Hot" },
];

type SheetSnap = "collapsed" | "half" | "full";
const SHEET_COLLAPSED = 120;
const SHEET_HALF_RATIO = 0.75;
const SHEET_FULL_RATIO = 0.92;

export default function RadarPage() {
  useRadarGeo();
  const navigate = useNavigate();

  const userLocation = useRadarStore((s) => s.userLocation);
  const setPoints = useRadarStore((s) => s.setPoints);
  const setSortMode = useRadarStore((s) => s.setSortMode);
  const sortMode = useRadarStore((s) => s.sortMode);
  const setMapMode = useRadarStore((s) => s.setMapMode);
  const category = useRadarStore((s) => s.category);
  const setCategory = useRadarStore((s) => s.setCategory);
  const subcategory = useRadarStore((s) => s.subcategory);
  const setSubCategory = useRadarStore((s) => s.setSubCategory);
  const filtered = useRadarStore((s) => s.filtered);
  const geoLoading = useGeoStore((s) => s.loading);
  const geoPermission = useGeoStore((s) => s.permission);

  const searchQuery = useDiscoveryStore((s) => s.searchQuery);
  const setSearchQuery = useDiscoveryStore((s) => s.setSearchQuery);

  const [loadingListings, setLoadingListings] = useState(true);
  const [showWeatherLayer, setShowWeatherLayer] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("collapsed");
  const [placeSuggestions, setPlaceSuggestions] = useState<NormalizedPlace[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeCtx = useMemo(() => getTimeContext(), []);
  const weather = useLiveWeatherStation({ lat: userLocation?.lat, lng: userLocation?.lng });

  const subcategories = useMemo(() => {
    return getSubcategoriesForRadarCategory(category as RadarMainCategory);
  }, [category]);

  useEffect(() => {
    const pt = useGeoStore.getState().point;
    if (!pt) geoService.forceRetry();
  }, []);

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const points = await fetchCanonicalDiscovery({
        surface: "radar",
        searchQuery: searchQuery || undefined,
        userLocation: userLocation ?? undefined,
        category: category !== "all" ? category : undefined,
        subcategory: subcategory ?? undefined,
      });
      setPoints(points);
    } catch (err) {
      console.error("[Radar] fetch failed:", err);
    } finally {
      setLoadingListings(false);
    }
  }, [searchQuery, setPoints, userLocation?.lat, userLocation?.lng, category, subcategory]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // ── Live place search (debounced Mapbox geocoding) ──
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = searchQuery?.trim();
    if (!q || q.length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    setSearchingPlaces(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(q, {
          limit: 6,
          proximity: userLocation ?? undefined,
        });
        setPlaceSuggestions(results);
      } catch {
        setPlaceSuggestions([]);
      } finally {
        setSearchingPlaces(false);
      }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, userLocation?.lat, userLocation?.lng]);

  const handleSelectPlace = (place: NormalizedPlace) => {
    setSearchQuery(place.label);
    setPlaceSuggestions([]);
    setSearchFocused(false);
    // TODO: Could center map on place.lat, place.lng
  };

  const handleLocate = () => {
    ultraHaptic("light");
    geoService.forceRetry();
  };

  // Sheet drag logic
  const getSheetHeight = (snap: SheetSnap) => {
    if (typeof window === "undefined") return SHEET_COLLAPSED;
    const vh = window.innerHeight;
    if (snap === "full") return vh * SHEET_FULL_RATIO;
    if (snap === "half") return vh * SHEET_HALF_RATIO;
    return SHEET_COLLAPSED;
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const vy = info.velocity.y;
    const dy = info.offset.y;
    if (vy > 300 || dy > 80) {
      // Swipe down
      setSheetSnap(sheetSnap === "full" ? "half" : "collapsed");
    } else if (vy < -300 || dy < -80) {
      // Swipe up
      setSheetSnap(sheetSnap === "collapsed" ? "half" : "full");
    }
  };

  const sheetHeight = getSheetHeight(sheetSnap);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden" style={{ zIndex: 1 }}>
      <RadarFilterMenu />

      {/* ═══ FULL-SCREEN MAP ═══ */}
      <div className="absolute inset-0">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <UnifiedMap
            entities={[]}
            onSelectEntity={() => {}}
            userLat={userLocation?.lat}
            userLng={userLocation?.lng}
            showUserLocation={!!userLocation}
            zoom={14}
            showHeatmap={false}
            showWeatherLayer={showWeatherLayer}
          />
        </Suspense>
      </div>

      {/* ═══ FLOATING TOP BAR — Glass ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.1 }}
        className="absolute top-0 left-0 right-0 z-20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }}
      >
        <div className="flex items-center gap-2 px-3 pt-2 pb-2">
          {/* Back */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "hsl(var(--background) / 0.3)",
              backdropFilter: "blur(24px) saturate(1.8)",
            }}
          >
            <ArrowLeft className="w-[18px] h-[18px]" style={{ color: "hsl(var(--foreground))" }} />
          </motion.button>

          {/* Search bar */}
          <motion.div
            layout
            className="flex-1 flex items-center gap-2 h-11 rounded-full px-4"
            style={{
              background: "hsl(var(--background) / 0.25)",
              backdropFilter: "blur(24px) saturate(1.8)",
              border: searchFocused ? "1px solid hsl(var(--primary) / 0.5)" : "1px solid hsl(var(--foreground) / 0.08)",
            }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} />
            <input
              type="text"
              placeholder="Search places…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { setSearchFocused(true); setSheetSnap("half"); }}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50"
              style={{ color: "hsl(var(--foreground))" }}
            />
            {searchQuery && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.8 }}
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              </motion.button>
            )}
          </motion.div>

          {/* Locate */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleLocate}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "hsl(var(--background) / 0.3)",
              backdropFilter: "blur(24px) saturate(1.8)",
            }}
          >
            {geoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--primary))" }} />
            ) : (
              <Navigation className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
            )}
          </motion.button>
        </div>

        {/* Weather + status pill */}
        <div className="flex items-center gap-2 px-4 pb-1">
          <AnimatePresence>
            {weather.isRaining && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg"
                style={{
                  background: "hsl(var(--card) / 0.8)",
                  backdropFilter: "blur(16px)",
                  color: "hsl(200 80% 60%)",
                }}
              >
                🌧 Rain live
              </motion.div>
            )}
          </AnimatePresence>
          {userLocation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{
                background: "hsl(var(--card) / 0.6)",
                backdropFilter: "blur(12px)",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              <MapPin className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />
              {timeCtx.emoji} {timeCtx.label}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ═══ FLOATING RIGHT CONTROLS ═══ */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.2 }}
        className="absolute right-3 z-20 flex flex-col gap-2"
        style={{ top: "max(calc(env(safe-area-inset-top, 0px) + 110px), 118px)" }}
      >
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setShowWeatherLayer(v => !v)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background: showWeatherLayer ? "hsl(var(--primary) / 0.15)" : "hsl(var(--card) / 0.85)",
            backdropFilter: "blur(20px)",
            border: showWeatherLayer ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid hsl(var(--border) / 0.15)",
          }}
        >
          <Layers className="w-4 h-4" style={{ color: showWeatherLayer ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
        </motion.button>
      </motion.div>

      {/* ═══ BOTTOM SHEET ═══ */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={{ height: sheetHeight }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className="absolute bottom-0 left-0 right-0 z-30 flex flex-col touch-none"
        style={{
          background: "hsl(var(--card) / 0.96)",
          backdropFilter: "blur(32px) saturate(1.8)",
          borderRadius: "24px 24px 0 0",
          borderTop: "1px solid hsl(var(--border) / 0.1)",
          boxShadow: "0 -8px 40px hsl(var(--background) / 0.5)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing">
          <motion.div
            className="w-10 h-1 rounded-full"
            style={{ background: "hsl(var(--muted-foreground) / 0.2)" }}
            whileHover={{ scaleX: 1.3, background: "hsl(var(--primary) / 0.5)" }}
          />
        </div>

        {/* Sheet header — result count + expand */}
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
              {filtered.length} places
            </span>
            {category !== "all" && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
              >
                {CATEGORIES.find(c => c.cat === category)?.icon} {CATEGORIES.find(c => c.cat === category)?.label}
              </motion.span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSheetSnap(sheetSnap === "collapsed" ? "half" : sheetSnap === "half" ? "full" : "collapsed")}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(var(--muted) / 0.5)" }}
          >
            <motion.div animate={{ rotate: sheetSnap === "full" ? 180 : 0 }} transition={{ type: "spring", stiffness: 400 }}>
              <ChevronUp className="w-4 h-4" style={{ color: "hsl(var(--foreground))" }} />
            </motion.div>
          </motion.button>
        </div>

        {/* Category chips — horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2">
          {CATEGORIES.map(({ cat, icon, label }, i) => {
            const active = category === cat;
            return (
              <motion.button
                key={cat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 500, damping: 35 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => { ultraHaptic("light"); setCategory(cat); }}
                className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[11px] whitespace-nowrap font-medium shrink-0"
                style={{
                  background: active ? "hsl(var(--primary) / 0.12)" : "hsl(var(--muted) / 0.4)",
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: active ? "1px solid hsl(var(--primary) / 0.2)" : "1px solid transparent",
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span>{icon}</span> {label}
              </motion.button>
            );
          })}
        </div>

        {/* Sort pills — only when sheet is half+ */}
        <AnimatePresence>
          {sheetSnap !== "collapsed" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2">
                {SORT_MODES.map(({ key, label }) => {
                  const active = sortMode === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => { ultraHaptic("light"); setSortMode(key); }}
                      className="rounded-full px-3 py-1 text-[10px] whitespace-nowrap shrink-0"
                      style={{
                        background: active ? "hsl(var(--primary) / 0.1)" : "transparent",
                        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.7)",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {label}
                    </motion.button>
                  );
                })}

                {/* Subcategories inline */}
                {subcategories.length > 0 && (
                  <>
                    <div className="w-px h-5 self-center shrink-0" style={{ background: "hsl(var(--border) / 0.2)" }} />
                    {subcategories.map((sub) => {
                      const active = subcategory === sub.value;
                      return (
                        <motion.button
                          key={sub.value}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => { ultraHaptic("light"); setSubCategory(subcategory === sub.value ? null : sub.value); }}
                          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] whitespace-nowrap shrink-0"
                          style={{
                            background: active ? "hsl(var(--primary) / 0.1)" : "transparent",
                            color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.6)",
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          <span>{sub.icon}</span> {sub.label}
                        </motion.button>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results list — scrollable when sheet is open */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4"
          style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
        >
          {loadingListings ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--primary))" }} />
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</p>
            </div>
          ) : (
            <RadarResultsList />
          )}
        </div>
      </motion.div>
    </div>
  );
}
