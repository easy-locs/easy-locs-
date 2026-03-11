import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import AppLogo from "@/components/AppLogo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Globe, ChevronDown, LocateFixed, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { RADIUS_OPTIONS, type RadiusValue } from "@/lib/geo-distance";
import { CATEGORY_HIERARCHY } from "@/lib/category-hierarchy";

// Extracted components
import { ExploreDesktopSearchBar, ExploreMobileSearch } from "@/components/explore/ExploreSearchBar";
import { ExploreCategoryBar } from "@/components/explore/ExploreCategoryBar";
import { ExploreListingCard } from "@/components/explore/ExploreListingCard";
import { ExploreFiltersStrip } from "@/components/explore/ExploreFiltersStrip";
import { ExploreSEOFooter } from "@/components/explore/ExploreSEOFooter";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import { ExploreRadiusSearch } from "@/components/explore/ExploreRadiusSearch";

/* ─────────── Types ─────────── */
interface RealEstateListing {
  id: string; title: string; listing_type: string; price: number; currency: string;
  property_type: string; country: string; city: string; photo_urls: string[] | null;
  slug: string; surface_sqm: number; rooms: number; bedrooms: number; bathrooms: number;
  views_count: number; created_at: string;
}

interface SeasonalListing {
  id: string; title: string; slug: string; price_per_night: number;
  max_guests: number; min_nights: number; active: boolean; description: string;
  property_id: string; org_id: string;
  city?: string; country?: string; cover_url?: string | null;
}

interface ServiceListing {
  id: string; title: string; description: string; category: string; city: string;
  country: string; price: number; currency: string; photo_urls: any;
  booking_slug: string; active: boolean; badges?: string[];
}

const ITEMS_PER_PAGE = 24;

/* ─────────── Component ─────────── */
export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const geo = useGeoDetect();

  // State — initialize from URL params, fallback to geo-detected location
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [locationQuery, setLocationQuery] = useState(searchParams.get("location") || "");
  const [activeGroup, setActiveGroup] = useState<string>(searchParams.get("group") || "all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>(searchParams.get("sub") || "all");
  const [radius, setRadius] = useState<RadiusValue>((searchParams.get("radius") as RadiusValue) || "worldwide");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showRadiusSearch, setShowRadiusSearch] = useState(false);
  const [radiusKm, setRadiusKm] = useState(0);
  const [geoApplied, setGeoApplied] = useState(false);

  // Keep the public explore page global by default.
  // Geo-detection is used for suggestions/placeholders only, not as an automatic filter.
  useEffect(() => {
    if (geoApplied) return;
    if (searchParams.get("location") || searchParams.get("q")) return;
    if (!geo.detection || geo.loading) return;

    setGeoApplied(true);
  }, [geo.detection, geo.loading, geoApplied, searchParams]);

  // Data
  const [realEstate, setRealEstate] = useState<RealEstateListing[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalListing[]>([]);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [reRes, seaRes, svcRes] = await Promise.allSettled([
        supabase.rpc("get_public_real_estate_listings", { p_limit: 200 }),
        supabase.from("public_listings").select("*").eq("active", true).order("created_at", { ascending: false }).limit(200),
        supabase.rpc("get_public_marketplace_services", {}),
      ]);

      const reData = reRes.status === "fulfilled" ? (reRes.value.data || []) as RealEstateListing[] : [];
      const seaData = seaRes.status === "fulfilled" ? (seaRes.value.data || []) as any[] : [];
      const svcData = svcRes.status === "fulfilled" ? (svcRes.value.data || []) as ServiceListing[] : [];

      const hadFailure = [reRes, seaRes, svcRes].some(
        (result) => result.status === "rejected" || (result.status === "fulfilled" && result.value.error),
      );

      let seasonalListings: SeasonalListing[] = seaData as SeasonalListing[];
      const propertyIds = [...new Set(seaData.map((l) => l.property_id).filter(Boolean))];
      if (propertyIds.length > 0) {
        const propsRes = await supabase.rpc("get_public_listing_properties", { p_property_ids: propertyIds });
        const propMap: Record<string, any> = {};
        if (propsRes.data) {
          for (const p of propsRes.data as any[]) propMap[p.id] = p;
        }
        seasonalListings = seaData.map((l) => {
          const prop = propMap[l.property_id];
          const photos = Array.isArray(prop?.photo_urls) ? prop.photo_urls : [];
          return { ...l, city: prop?.city || "", country: prop?.country || "", cover_url: photos[0] || null };
        });
      }

      if (cancelled) return;

      setRealEstate(reData);
      setServices(svcData);
      setSeasonal(seasonalListings);
      setLoadError(hadFailure ? "Some listings could not be loaded right now." : null);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Aggregate unique locations
  const allCountries = useMemo(() => {
    const set = new Set<string>();
    realEstate.forEach(l => l.country && set.add(l.country));
    seasonal.forEach(l => l.country && set.add(l.country));
    services.forEach(l => l.country && set.add(l.country));
    return Array.from(set).sort();
  }, [realEstate, seasonal, services]);

  const allCities = useMemo(() => {
    const set = new Set<string>();
    realEstate.forEach(l => l.city && set.add(l.city));
    seasonal.forEach(l => l.city && set.add(l.city));
    services.forEach(l => l.city && set.add(l.city));
    return Array.from(set).sort();
  }, [realEstate, seasonal, services]);

  // Location suggestions
  const locationSuggestions = useMemo(() => {
    const q = locationQuery.toLowerCase().trim();
    const suggestions: { label: string; type: "geo" | "city" | "country" }[] = [];
    if (geo.detection?.city && (!q || "near me".includes(q) || geo.detection.city.toLowerCase().includes(q))) {
      suggestions.push({ label: `📍 Near me — ${geo.detection.city}, ${geo.country.toUpperCase()}`, type: "geo" });
    }
    allCities.filter(c => !q || c.toLowerCase().includes(q)).slice(0, 6).forEach(c => suggestions.push({ label: c, type: "city" }));
    allCountries.filter(c => !q || c.toLowerCase().includes(q)).slice(0, 4).forEach(c => suggestions.push({ label: c.toUpperCase(), type: "country" }));
    return suggestions.slice(0, 8);
  }, [locationQuery, allCities, allCountries, geo.detection, geo.country]);

  // Filtering
  const matchText = useCallback((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (item.title || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q);
  }, [searchQuery]);

  const matchLocation = useCallback((item: any) => {
    if (radius === "worldwide" && !locationQuery) return true;
    const itemCity = (item.city || "").toLowerCase();
    const itemCountry = (item.country || "").toLowerCase();

    if (radius !== "worldwide" && radius !== "city" && radius !== "country" && geo.detection?.lat && geo.detection?.lng) {
      if (locationQuery) {
        const q = locationQuery.toLowerCase();
        return itemCity.includes(q) || itemCountry.includes(q);
      }
      if (geo.detection?.city) {
        return itemCity === geo.detection.city.toLowerCase() || itemCountry === geo.country.toLowerCase();
      }
      return true;
    }

    if (radius === "city") {
      const targetCity = locationQuery || geo.detection?.city || "";
      if (!targetCity) return true;
      return itemCity === targetCity.toLowerCase();
    }

    if (radius === "country") {
      const targetCountry = locationQuery || geo.country || "";
      if (!targetCountry) return true;
      return itemCountry === targetCountry.toLowerCase();
    }

    if (locationQuery) {
      const q = locationQuery.toLowerCase();
      return itemCity.includes(q) || itemCountry.includes(q);
    }

    return true;
  }, [locationQuery, radius, geo.detection, geo.country]);

  const matchCategory = useCallback((item: any) => {
    if (activeGroup === "all" && activeSubcategory === "all") return true;
    const type = item._type as string;
    if (activeSubcategory !== "all") {
      if (activeSubcategory === "seasonal") return type === "seasonal";
      if (activeSubcategory === "real-estate") return type === "real-estate";
      return type === "service" && item.category === activeSubcategory;
    }
    const group = CATEGORY_HIERARCHY.find(g => g.value === activeGroup);
    if (!group) return true;
    const subValues = group.subcategories.map(s => s.value);
    if (subValues.includes("seasonal") && type === "seasonal") return true;
    if (subValues.includes("real-estate") && type === "real-estate") return true;
    if (type === "service" && subValues.includes(item.category)) return true;
    return false;
  }, [activeGroup, activeSubcategory]);

  const allItems = useMemo(() => {
    const items: Array<any & { _type: string }> = [];
    seasonal.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "seasonal" }));
    realEstate.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "real-estate" }));
    services.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "service" }));
    return items.filter(matchCategory);
  }, [seasonal, realEstate, services, matchText, matchLocation, matchCategory]);

  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [activeGroup, activeSubcategory, searchQuery, locationQuery, radius]);

  const handleSelectLocation = (suggestion: { label: string; type: string }) => {
    if (suggestion.type === "geo" && geo.detection?.city) {
      setLocationQuery(geo.detection.city);
      setRadius("city");
    } else {
      setLocationQuery(suggestion.label);
      if (suggestion.type === "country") setRadius("country");
      else if (suggestion.type === "city") setRadius("city");
    }
    setGeoApplied(true); // prevent auto-override
  };

  const handleNearMe = () => {
    if (geo.detection?.city) {
      setLocationQuery(geo.detection.city);
      setRadius("25");
    } else if (geo.country) {
      setLocationQuery(geo.country);
      setRadius("country");
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (locationQuery) params.set("location", locationQuery);
    if (activeGroup !== "all") params.set("group", activeGroup);
    if (activeSubcategory !== "all") params.set("sub", activeSubcategory);
    if (radius !== "worldwide") params.set("radius", radius);
    setSearchParams(params);
  };

  const clearAll = () => {
    setSearchQuery(""); setLocationQuery(""); setActiveGroup("all"); setActiveSubcategory("all");
    setRadius("worldwide"); setVisibleCount(ITEMS_PER_PAGE); setSearchParams({});
    setGeoApplied(false); // allow geo re-detection
  };

  const hasFilters = !!(searchQuery || locationQuery || activeGroup !== "all" || activeSubcategory !== "all" || radius !== "worldwide");
  const radiusLabel = RADIUS_OPTIONS.find(r => r.value === radius)?.label || "Worldwide";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Explore — Real Estate, Rentals & Services Worldwide | Easy-Locs"
        description="Discover properties for sale, vacation rentals, and local services worldwide. Browse verified listings from trusted hosts and providers on Easy-Locs."
        canonical="https://www.easy-locs.com/explore"
      />

      {/* ═══════ STICKY HEADER ═══════ */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="h-16 flex items-center justify-between gap-4">
            <AppLogo variant="header" linkTo="/" />

            <ExploreDesktopSearchBar
              searchQuery={searchQuery}
              locationQuery={locationQuery}
              radius={radius}
              radiusLabel={radiusLabel}
              geoCity={geo.detection?.city}
              geoCountry={geo.country}
              locationSuggestions={locationSuggestions}
              onSearchQueryChange={setSearchQuery}
              onLocationQueryChange={setLocationQuery}
              onRadiusChange={setRadius}
              onSelectLocation={handleSelectLocation}
              onNearMe={handleNearMe}
              onSearch={handleSearch}
            />

            {/* Mobile search trigger */}
            <button onClick={() => setShowMobileSearch(v => !v)} className="md:hidden flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card shadow-sm text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span className="truncate max-w-[140px]">{searchQuery || locationQuery || "Search..."}</span>
            </button>

            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              {/* Radius search toggle */}
              <button
                onClick={() => setShowRadiusSearch(v => !v)}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all ${
                  showRadiusSearch ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                Map
              </button>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">Log in</Link>
              <Link to="/signup" className="text-sm font-semibold px-4 py-2 rounded-full bg-accent text-accent-foreground hover:opacity-90 transition-opacity">Sign up</Link>
            </div>
          </div>

          {/* Mobile search panel */}
          <AnimatePresence>
            {showMobileSearch && (
              <ExploreMobileSearch
                searchQuery={searchQuery}
                locationQuery={locationQuery}
                radius={radius}
                geoCity={geo.detection?.city}
                geoCountry={geo.country}
                hasFilters={hasFilters}
                onSearchQueryChange={setSearchQuery}
                onLocationQueryChange={setLocationQuery}
                onRadiusChange={setRadius}
                onNearMe={handleNearMe}
                onSearch={handleSearch}
                onClearAll={clearAll}
                onClose={() => setShowMobileSearch(false)}
              />
            )}
          </AnimatePresence>
        </div>

        <ExploreCategoryBar
          activeGroup={activeGroup}
          activeSubcategory={activeSubcategory}
          onGroupChange={setActiveGroup}
          onSubcategoryChange={setActiveSubcategory}
        />
      </header>

      {/* ═══════ RESULTS ═══════ */}
      <main className="max-w-[1400px] mx-auto px-4 py-6 flex gap-6">
        {/* Radius search sidebar */}
        <AnimatePresence>
          {showRadiusSearch && (
            <div className="hidden sm:block shrink-0">
              <ExploreRadiusSearch
                locationQuery={locationQuery}
                radiusKm={radiusKm}
                resultCount={allItems.length}
                geoCity={geo.detection?.city}
                geoCountry={geo.country}
                onLocationChange={setLocationQuery}
                onRadiusChange={(km) => {
                  setRadiusKm(km);
                  if (km === 0) setRadius("worldwide");
                  else if (km <= 5) setRadius("5");
                  else if (km <= 10) setRadius("10");
                  else if (km <= 25) setRadius("25");
                  else if (km <= 50) setRadius("50");
                  else setRadius("country");
                }}
                onApply={handleSearch}
                onReset={() => { clearAll(); setRadiusKm(0); }}
                onNearMe={handleNearMe}
                onClose={() => setShowRadiusSearch(false)}
              />
            </div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-w-0">
        {hasFilters && (
          <ExploreFiltersStrip
            searchQuery={searchQuery}
            locationQuery={locationQuery}
            radius={radius}
            radiusLabel={radiusLabel}
            activeSubcategory={activeSubcategory}
            onClearSearch={() => setSearchQuery("")}
            onClearLocation={() => setLocationQuery("")}
            onClearRadius={() => setRadius("worldwide")}
            onClearSubcategory={() => setActiveSubcategory("all")}
            onClearAll={clearAll}
          />
        )}

        {/* Geo context banner */}
        {!loading && geo.detection?.city && locationQuery && geoApplied && !searchParams.get("location") && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-accent/5 border border-accent/15">
            <LocateFixed className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm text-muted-foreground">
              📍 Auto-located to <strong className="text-foreground">{geo.detection.country?.toUpperCase()}</strong>.
              {geo.detection.city && (
                <> <button onClick={handleNearMe} className="text-accent font-semibold hover:underline ml-1">Show near {geo.detection.city}</button></>
              )}
              {" · "}
              <button onClick={clearAll} className="text-muted-foreground hover:text-foreground underline">Show worldwide</button>
            </span>
          </motion.div>
        )}

        {loadError && (
          <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {loadError}
          </div>
        )}

        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">
            {loading ? "Loading..." : `${allItems.length} listing${allItems.length !== 1 ? "s" : ""}`}
            {locationQuery && <span className="text-muted-foreground font-normal"> in {locationQuery}</span>}
            {radius !== "worldwide" && !locationQuery && <span className="text-muted-foreground font-normal"> • {radiusLabel}</span>}
          </h2>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            {allCountries.length} countries | {allCities.length} cities
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-border bg-card">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : allItems.length === 0 ? (
          <ExploreEmptyState onClear={clearAll} hasFilters={hasFilters} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {allItems.slice(0, visibleCount).map((item, i) => (
                <motion.div key={`${item._type}-${item.id}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <ExploreListingCard item={item} />
                </motion.div>
              ))}
            </div>
            {visibleCount < allItems.length && (
              <div className="flex justify-center pt-10">
                <Button variant="outline" size="lg" onClick={() => setVisibleCount(c => c + ITEMS_PER_PAGE)} className="rounded-full gap-2 px-8 min-h-[48px] shadow-sm hover:shadow-md transition-shadow">
                  Show more ({visibleCount} of {allItems.length})
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <ExploreSEOFooter />

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} <span className="font-semibold">EASY-LOCS®</span> — All rights reserved</span>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
