import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Globe, ChevronDown, LocateFixed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { CATEGORY_HIERARCHY } from "@/lib/category-hierarchy";
import { useI18n } from "@/lib/i18n";
import { haversineKm } from "@/lib/geo-distance";
import { batchGeocideCities, cityKey, type CityCoords } from "@/lib/city-geocoder";

// Extracted components
import { ExploreDesktopSearchBar, ExploreMobileSearch } from "@/components/explore/ExploreSearchBar";
import { ExploreCategoryBar } from "@/components/explore/ExploreCategoryBar";
import { ExploreListingCard } from "@/components/explore/ExploreListingCard";
import { ExploreFiltersStrip } from "@/components/explore/ExploreFiltersStrip";
import { ExploreSEOFooter } from "@/components/explore/ExploreSEOFooter";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import SmartSuggestions from "@/components/explore/SmartSuggestions";
import ExploreHeader from "@/components/explore/ExploreHeader";

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
  listing_type?: string; surface_sqm?: number; rooms?: number;
  bedrooms?: number; bathrooms?: number; contact_whatsapp?: string;
  source_contact_email?: string; brand?: string; model?: string;
  condition?: string; features?: any; deposit_amount?: number;
  quantity?: number; contact_email?: string;
}

const ITEMS_PER_PAGE = 24;

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const geo = useGeoDetect();
  const { t } = useI18n();

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [locationQuery, setLocationQuery] = useState(searchParams.get("location") || "");
  const [activeGroup, setActiveGroup] = useState<string>(searchParams.get("group") || "all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>(searchParams.get("sub") || "all");
  const [radiusKm, setRadiusKm] = useState(() => parseInt(searchParams.get("radius") || "0", 10) || 0);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [cityCoordsMap, setCityCoordsMap] = useState<Map<string, CityCoords>>(new Map());
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [geoApplied, setGeoApplied] = useState(false);
  const geocodingRef = useRef(false);

  // Geo-detection passive
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
      const hadFailure = [reRes, seaRes, svcRes].some(r => r.status === "rejected" || (r.status === "fulfilled" && r.value.error));

      let seasonalListings: SeasonalListing[] = seaData as SeasonalListing[];
      const propertyIds = [...new Set(seaData.map(l => l.property_id).filter(Boolean))];
      if (propertyIds.length > 0) {
        const propsRes = await supabase.rpc("get_public_listing_properties", { p_property_ids: propertyIds });
        const propMap: Record<string, any> = {};
        if (propsRes.data) for (const p of propsRes.data as any[]) propMap[p.id] = p;
        seasonalListings = seaData.map(l => {
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
    return () => { cancelled = true; };
  }, []);

  // Batch geocode unique listing cities for distance filtering
  useEffect(() => {
    if (loading || geocodingRef.current) return;
    geocodingRef.current = true;
    const uniqueCities: Array<{ city: string; country?: string }> = [];
    const seen = new Set<string>();
    for (const list of [realEstate, seasonal, services]) {
      for (const item of list) {
        const c = (item as any).city;
        const co = (item as any).country;
        if (!c) continue;
        const k = cityKey(c, co);
        if (seen.has(k)) continue;
        seen.add(k);
        uniqueCities.push({ city: c, country: co });
      }
    }
    if (uniqueCities.length > 0) {
      batchGeocideCities(uniqueCities, 15).then(map => {
        setCityCoordsMap(map);
      });
    }
  }, [loading, realEstate, seasonal, services]);

  // Aggregate locations
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
    return (item.title || "").toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q);
  }, [searchQuery]);

  const matchLocation = useCallback((item: any) => {
    if (radiusKm === 0 && !locationQuery) return true;
    const itemCity = (item.city || "").toLowerCase();
    const itemCountry = (item.country || "").toLowerCase();

    // If we have a search center and radius, use real distance filtering
    if (searchCenter && radiusKm > 0) {
      const key = cityKey(item.city || "", item.country || "");
      const coords = cityCoordsMap.get(key);
      if (coords) {
        const dist = haversineKm(searchCenter.lat, searchCenter.lng, coords.lat, coords.lng);
        return dist <= radiusKm;
      }
      // Fallback to string match if coords not yet geocoded
      if (locationQuery) {
        const q = locationQuery.toLowerCase();
        return itemCity.includes(q) || itemCountry.includes(q);
      }
      return true;
    }

    // String-based fallback when no coordinates
    if (locationQuery) {
      const q = locationQuery.toLowerCase();
      return itemCity.includes(q) || itemCountry.includes(q);
    }
    return true;
  }, [locationQuery, radiusKm, searchCenter, cityCoordsMap]);

  const matchCategory = useCallback((item: any) => {
    if (activeGroup === "all" && activeSubcategory === "all") return true;
    const type = item._type as string;
    // Subcategory-level filter
    if (activeSubcategory !== "all") {
      if (activeSubcategory === "seasonal") return type === "seasonal";
      if (activeSubcategory === "property_sale") return type === "real-estate" && item.listing_type === "sale";
      if (activeSubcategory === "long_term_rental") return type === "real-estate" && item.listing_type !== "sale";
      if (activeSubcategory === "new_development") return type === "real-estate";
      if (activeSubcategory === "roommate" || activeSubcategory === "office_commercial") return type === "real-estate";
      return type === "service" && item.category === activeSubcategory;
    }
    // Group-level filter
    const group = CATEGORY_HIERARCHY.find(g => g.value === activeGroup);
    if (!group) return true;
    const subValues = group.subcategories.map(s => s.value);
    if (subValues.includes("seasonal") && type === "seasonal") return true;
    if ((subValues.includes("property_sale") || subValues.includes("long_term_rental")) && type === "real-estate") return true;
    if (type === "service" && subValues.includes(item.category)) return true;
    return false;
  }, [activeGroup, activeSubcategory]);

  const unfilteredItems = useMemo(() => {
    const items: Array<any & { _type: string }> = [];
    seasonal.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "seasonal" }));
    realEstate.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "real-estate" }));
    services.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "service" }));
    return items;
  }, [seasonal, realEstate, services, matchText, matchLocation]);

  const allItems = useMemo(() => unfilteredItems.filter(matchCategory), [unfilteredItems, matchCategory]);

  // Count items per group for category bar badges
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: unfilteredItems.length };
    for (const group of CATEGORY_HIERARCHY) {
      const subValues = group.subcategories.map(s => s.value);
      counts[group.value] = unfilteredItems.filter(item => {
        const type = item._type as string;
        if (subValues.includes("seasonal") && type === "seasonal") return true;
        if ((subValues.includes("property_sale") || subValues.includes("long_term_rental")) && type === "real-estate") return true;
        if (type === "service" && subValues.includes(item.category)) return true;
        return false;
      }).length;
    }
    return counts;
  }, [unfilteredItems]);

  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [activeGroup, activeSubcategory, searchQuery, locationQuery, radiusKm]);

  const handleSelectLocation = (suggestion: { label: string; type: string }) => {
    if (suggestion.type === "geo" && geo.detection?.city) {
      setLocationQuery(geo.detection.city);
      setRadiusKm(25);
      // Use GPS/IP coordinates as search center
      if (geo.detection.lat && geo.detection.lng) {
        setSearchCenter({ lat: geo.detection.lat, lng: geo.detection.lng });
      }
    } else {
      setLocationQuery(suggestion.label);
      if (suggestion.type === "city") {
        setRadiusKm(25);
        // Geocode the selected city to get coordinates
        import("@/lib/city-geocoder").then(({ getCityCoords }) => {
          getCityCoords(suggestion.label).then(coords => {
            if (coords) setSearchCenter(coords);
          });
        });
      }
    }
    setGeoApplied(true);
  };

  const handleNearMe = () => {
    if (geo.detection?.city) {
      setLocationQuery(geo.detection.city);
      setRadiusKm(25);
      if (geo.detection.lat && geo.detection.lng) {
        setSearchCenter({ lat: geo.detection.lat, lng: geo.detection.lng });
      }
    } else if (geo.country) {
      setLocationQuery(geo.country);
      setRadiusKm(100);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (locationQuery) params.set("location", locationQuery);
    if (activeGroup !== "all") params.set("group", activeGroup);
    if (activeSubcategory !== "all") params.set("sub", activeSubcategory);
    if (radiusKm > 0) params.set("radius", String(radiusKm));
    setSearchParams(params);
  };

  const clearAll = () => {
    setSearchQuery(""); setLocationQuery(""); setActiveGroup("all"); setActiveSubcategory("all");
    setRadiusKm(0); setSearchCenter(null); setVisibleCount(ITEMS_PER_PAGE); setSearchParams({});
    setGeoApplied(false);
  };

  const hasFilters = !!(searchQuery || locationQuery || activeGroup !== "all" || activeSubcategory !== "all" || radiusKm > 0);
  const radiusLabel = radiusKm === 0 ? "Worldwide" : `${radiusKm} km`;

    const exploreJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Explore Properties, Rentals & Services — Easy-Locs",
      description: "Discover properties for sale, vacation rentals, and local services worldwide on Easy-Locs.",
      url: "https://www.easy-locs.com/explore",
      provider: { "@type": "Organization", name: "Easy-Locs", url: "https://www.easy-locs.com" },
      numberOfItems: allItems.length,
    };

    return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Explore — Real Estate, Rentals & Services Worldwide | Easy-Locs"
        description="Discover properties for sale, vacation rentals, and local services worldwide. Browse verified listings from trusted hosts and providers on Easy-Locs."
        canonical="https://www.easy-locs.com/explore"
        jsonLd={exploreJsonLd}
      />

      {/* ═══════ STICKY HEADER ═══════ */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="h-16 flex items-center justify-between gap-4">
            <AppLogo variant="header" linkTo="/" />

            <ExploreDesktopSearchBar
              searchQuery={searchQuery}
              locationQuery={locationQuery}
              radiusKm={radiusKm}
              activeGroup={activeGroup}
              geoCity={geo.detection?.city}
              geoCountry={geo.country}
              geoLat={geo.detection?.lat}
              geoLng={geo.detection?.lng}
              locationSuggestions={locationSuggestions}
              resultCount={allItems.length}
              onSearchQueryChange={setSearchQuery}
              onLocationQueryChange={setLocationQuery}
              onRadiusKmChange={setRadiusKm}
              onGroupChange={(g) => { setActiveGroup(g); setActiveSubcategory("all"); }}
              onSelectLocation={handleSelectLocation}
              onNearMe={handleNearMe}
              onSearch={handleSearch}
              onReset={clearAll}
            />

            {/* Mobile search trigger */}
            <button onClick={() => setShowMobileSearch(v => !v)} className="md:hidden flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card shadow-sm text-sm text-muted-foreground min-h-[44px]" aria-label={t("explore.search") || "Open search"}>
              <Search className="h-4 w-4" />
              <span className="truncate max-w-[140px]">{searchQuery || locationQuery || t("explore.search") || "Search..."}</span>
            </button>

            <ExploreUserNav />
          </div>

          {/* Mobile search panel */}
          <AnimatePresence>
            {showMobileSearch && (
              <ExploreMobileSearch
                searchQuery={searchQuery}
                locationQuery={locationQuery}
                radiusKm={radiusKm}
                activeGroup={activeGroup}
                geoCity={geo.detection?.city}
                geoCountry={geo.country}
                geoLat={geo.detection?.lat}
                geoLng={geo.detection?.lng}
                hasFilters={hasFilters}
                resultCount={allItems.length}
                onSearchQueryChange={setSearchQuery}
                onLocationQueryChange={setLocationQuery}
                onRadiusKmChange={setRadiusKm}
                onGroupChange={(g) => { setActiveGroup(g); setActiveSubcategory("all"); }}
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
          groupCounts={groupCounts}
        />
      </header>

      {/* ═══════ RESULTS ═══════ */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {hasFilters && (
          <ExploreFiltersStrip
            searchQuery={searchQuery}
            locationQuery={locationQuery}
            radius={radiusKm === 0 ? "worldwide" : String(radiusKm) as any}
            radiusLabel={radiusLabel}
            activeSubcategory={activeSubcategory}
            onClearSearch={() => setSearchQuery("")}
            onClearLocation={() => setLocationQuery("")}
            onClearRadius={() => setRadiusKm(0)}
            onClearSubcategory={() => setActiveSubcategory("all")}
            onClearAll={clearAll}
          />
        )}

        {/* GPS Near Me quick button — show when no location filter active */}
        {!loading && !locationQuery && geo.detection?.city && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-accent/5 border border-accent/15">
            <LocateFixed className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              📍 {t("explore.detected_location") || "Detected location"}: <strong className="text-foreground">{geo.detection.city}, {geo.country.toUpperCase()}</strong>
            </span>
            <button onClick={handleNearMe} className="text-xs font-semibold text-accent-foreground bg-accent px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap">
              {t("explore.near_me") || "Near me"}
            </button>
          </motion.div>
        )}

        {/* Geo context banner when location filter is active */}
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
          <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">{loadError}</div>
        )}

        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-foreground">
            {loading ? "..." : locationQuery
              ? `${locationQuery} — ${allItems.length} ${allItems.length === 1 ? (t("explore.result") || "result") : (t("explore.results") || "results")}`
              : `${allItems.length} ${t("explore.listings") || "listings"}`}
            {radiusKm > 0 && <span className="text-muted-foreground font-normal"> · {radiusKm} km</span>}
          </h1>
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
                  {t("explore.show_more") || "Show more"} ({allItems.length - visibleCount})
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Smart Suggestions — show related items from different categories */}
        {!loading && allItems.length > 0 && (() => {
          const currentCategories = new Set(allItems.slice(0, 6).map((i: any) => i.category || i._type));
          const suggestions = unfilteredItems
            .filter((item: any) => !currentCategories.has(item.category || item._type))
            .slice(0, 8)
            .map((item: any) => ({
              id: item.id,
              title: item.title,
              city: item.city,
              country: item.country,
              photo_url: item._type === "seasonal" ? item.cover_url : item.photo_urls?.[0],
              price: item.price || item.price_per_night,
              currency: item.currency || "EUR",
              href: item._type === "seasonal"
                ? `/listing/${item.slug}`
                : item._type === "real-estate"
                ? `/properties/${item.slug}`
                : `/book/${item.booking_slug}`,
            }));
          return <SmartSuggestions items={suggestions} title={t("explore.you_may_like") || "You may also be interested in"} />;
        })()}
      </main>

      <ExploreSEOFooter />

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
