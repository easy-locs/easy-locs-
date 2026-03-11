import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import AppLogo from "@/components/AppLogo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, MapPin, Globe, ArrowRight, Eye,
  Users, Moon, X, ChevronDown, Sparkles,
  LocateFixed, CheckCircle, Radar, Briefcase, Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { haversineKm, RADIUS_OPTIONS, type RadiusValue } from "@/lib/geo-distance";
import { CATEGORY_HIERARCHY, getSubcategoryInfo } from "@/lib/category-hierarchy";
import { SEO_COUNTRIES, SEO_SERVICE_CATEGORIES, getPhase1Cities } from "@/lib/seo/seo-data";

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

const SERVICE_CATEGORY_KEYS = [
  "cleaning", "maintenance", "construction", "transport", "car_rental",
  "airport_transfer", "tours", "water_sport", "spa", "sports_coach",
  "restaurant", "coworking", "legal", "business_services", "consulting",
  "personal", "event", "other",
];

const PLACEHOLDER_IMG = "/placeholder.svg";
const ITEMS_PER_PAGE = 24;

/* ─────────── Component ─────────── */
export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const geo = useGeoDetect();

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [locationQuery, setLocationQuery] = useState(searchParams.get("location") || "");
  const [activeGroup, setActiveGroup] = useState<string>(searchParams.get("group") || "all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>(searchParams.get("sub") || "all");
  const [radius, setRadius] = useState<RadiusValue>((searchParams.get("radius") as RadiusValue) || "worldwide");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const radiusRef = useRef<HTMLDivElement>(null);

  // Data
  const [realEstate, setRealEstate] = useState<RealEstateListing[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalListing[]>([]);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [reRes, seaRes, svcRes] = await Promise.all([
        supabase.rpc("get_public_real_estate_listings", { p_limit: 200 }),
        supabase.from("public_listings").select("*").eq("active", true).order("created_at", { ascending: false }).limit(200),
        supabase.rpc("get_public_marketplace_services", {}),
      ]);
      setRealEstate((reRes.data || []) as RealEstateListing[]);
      setServices((svcRes.data || []) as ServiceListing[]);

      const rawListings = (seaRes.data || []) as any[];
      const propertyIds = [...new Set(rawListings.map(l => l.property_id))];
      let propMap: Record<string, any> = {};
      if (propertyIds.length > 0) {
        const { data: props } = await supabase.rpc("get_public_listing_properties", { p_property_ids: propertyIds });
        if (props) for (const p of props as any[]) propMap[p.id] = p;
      }
      setSeasonal(rawListings.map(l => {
        const prop = propMap[l.property_id];
        const photos = Array.isArray(prop?.photo_urls) ? prop.photo_urls : [];
        return { ...l, city: prop?.city || "", country: prop?.country || "", cover_url: photos[0] || null };
      }));
      setLoading(false);
    };
    load();
  }, []);

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setShowLocationSuggestions(false);
      if (radiusRef.current && !radiusRef.current.contains(e.target as Node)) setShowRadiusMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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

  // Filtering logic
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

    // Radius-based filtering with geo coordinates
    if (radius !== "worldwide" && radius !== "city" && radius !== "country" && geo.detection?.lat && geo.detection?.lng) {
      const opt = RADIUS_OPTIONS.find(r => r.value === radius);
      if (opt?.km) {
        // For now, we match by city name since items don't have lat/lng
        // If locationQuery is set, also match text
        if (locationQuery) {
          const q = locationQuery.toLowerCase();
          return itemCity.includes(q) || itemCountry.includes(q);
        }
        // Near me with radius: match the detected city
        if (geo.detection?.city) {
          return itemCity === geo.detection.city.toLowerCase() ||
            itemCountry === geo.country.toLowerCase();
        }
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

    // Group-level filtering
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

  // Reset pagination on filter changes
  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [activeGroup, activeSubcategory, searchQuery, locationQuery, radius]);

  // Active group subcategories
  const activeGroupData = CATEGORY_HIERARCHY.find(g => g.value === activeGroup);

  const handleSelectLocation = (suggestion: { label: string; type: string }) => {
    if (suggestion.type === "geo" && geo.detection?.city) {
      setLocationQuery(geo.detection.city);
      if (radius === "worldwide") setRadius("city");
    } else {
      setLocationQuery(suggestion.label);
      if (suggestion.type === "country") setRadius("country");
      else if (suggestion.type === "city") setRadius("city");
    }
    setShowLocationSuggestions(false);
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
    setShowLocationSuggestions(false);
  };

  const clearAll = () => {
    setSearchQuery(""); setLocationQuery(""); setActiveGroup("all"); setActiveSubcategory("all");
    setRadius("worldwide"); setVisibleCount(ITEMS_PER_PAGE); setSearchParams({});
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
          {/* Top bar */}
          <div className="h-16 flex items-center justify-between gap-4">
            <AppLogo variant="header" linkTo="/" />

            {/* Desktop search bar */}
            <div className="hidden md:flex items-center flex-1 max-w-3xl mx-8">
              <div className="flex items-center w-full bg-card border border-border rounded-full shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex-1 px-5 py-2 border-r border-border">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">What</label>
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Service, property..."
                    className="border-0 p-0 h-6 text-sm bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="flex-1 px-5 py-2 border-r border-border relative" ref={locationRef}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Where</label>
                  <div className="flex items-center gap-1">
                    <Input
                      value={locationQuery}
                      onChange={e => { setLocationQuery(e.target.value); setShowLocationSuggestions(true); }}
                      onFocus={() => setShowLocationSuggestions(true)}
                      onKeyDown={e => e.key === "Enter" && handleSearch()}
                      placeholder={geo.detection?.city ? `${geo.detection.city}, ${geo.country.toUpperCase()}` : "City, country..."}
                      className="border-0 p-0 h-6 text-sm bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 flex-1"
                    />
                    {geo.detection?.city && !locationQuery && (
                      <button onClick={handleNearMe} className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors" title="Use my location">
                        <LocateFixed className="h-3.5 w-3.5 text-accent" />
                      </button>
                    )}
                  </div>
                  {/* Location suggestions dropdown */}
                  <AnimatePresence>
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                      >
                        {locationSuggestions.map((s, i) => (
                          <button key={`${s.type}-${s.label}-${i}`} onClick={() => handleSelectLocation(s)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                            {s.type === "geo" ? <LocateFixed className="h-4 w-4 text-accent shrink-0" /> : s.type === "city" ? <MapPin className="h-4 w-4 text-muted-foreground shrink-0" /> : <Globe className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <span className="truncate text-foreground">{s.label}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground uppercase">{s.type === "geo" ? "Near you" : s.type}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Radius selector */}
                <div className="px-4 py-2 relative" ref={radiusRef}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Radius</label>
                  <button
                    onClick={() => setShowRadiusMenu(v => !v)}
                    className="flex items-center gap-1 h-6 text-sm text-foreground font-medium hover:text-accent transition-colors"
                  >
                    <Radar className="h-3.5 w-3.5" />
                    {radiusLabel}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <AnimatePresence>
                    {showRadiusMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden w-44"
                      >
                        {RADIUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => { setRadius(opt.value); setShowRadiusMenu(false); }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 ${
                              radius === opt.value ? "text-accent font-semibold bg-accent/5" : "text-foreground"
                            }`}
                          >
                            {radius === opt.value && <CheckCircle className="h-3.5 w-3.5 text-accent" />}
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button onClick={handleSearch} className="shrink-0 w-10 h-10 mr-1.5 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mobile search trigger */}
            <button onClick={() => setShowMobileSearch(v => !v)} className="md:hidden flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card shadow-sm text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span className="truncate max-w-[140px]">{searchQuery || locationQuery || "Search..."}</span>
            </button>

            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">Log in</Link>
              <Link to="/signup" className="text-sm font-semibold px-4 py-2 rounded-full bg-accent text-accent-foreground hover:opacity-90 transition-opacity">Sign up</Link>
            </div>
          </div>

          {/* Mobile search panel */}
          <AnimatePresence>
            {showMobileSearch && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden pb-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="What are you looking for?" className="pl-10 rounded-xl" />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={locationQuery} onChange={e => setLocationQuery(e.target.value)} placeholder={geo.detection?.city ? `${geo.detection.city}, ${geo.country.toUpperCase()}` : "City or country"} className="pl-10 rounded-xl" />
                  </div>
                  {/* Mobile radius */}
                  <div className="flex flex-wrap gap-1.5">
                    {RADIUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setRadius(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          radius === opt.value ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {geo.detection?.city && !locationQuery && (
                    <button onClick={handleNearMe} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent font-medium hover:bg-accent/15 transition-colors">
                      <LocateFixed className="h-4 w-4" />
                      Near me — {geo.detection.city}, {geo.country.toUpperCase()}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => { handleSearch(); setShowMobileSearch(false); }} className="flex-1 rounded-xl gap-2">
                      <Search className="h-4 w-4" /> Search
                    </Button>
                    {hasFilters && <Button variant="outline" onClick={clearAll} className="rounded-xl"><X className="h-4 w-4" /></Button>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════ CATEGORY GROUP BAR ═══════ */}
        <div className="border-t border-border/50">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-3 -mx-1">
              <button
                onClick={() => { setActiveGroup("all"); setActiveSubcategory("all"); }}
                className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all min-w-[64px] min-h-[56px] ${
                  activeGroup === "all" ? "text-foreground border-b-2 border-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Globe className="h-5 w-5" />
                <span>All</span>
              </button>
              {CATEGORY_HIERARCHY.map(group => {
                const isActive = activeGroup === group.value;
                return (
                  <button
                    key={group.value}
                    onClick={() => { setActiveGroup(group.value); setActiveSubcategory("all"); }}
                    className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all min-w-[64px] min-h-[56px] ${
                      isActive ? "text-foreground border-b-2 border-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-lg">{group.emoji}</span>
                    <span className="truncate max-w-[72px] leading-none">{group.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════ SUB-CATEGORY BAR ═══════ */}
        {activeGroup !== "all" && activeGroupData && (
          <div className="border-t border-border/30 bg-muted/20">
            <div className="max-w-[1400px] mx-auto px-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2">
                <button
                  onClick={() => setActiveSubcategory("all")}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeSubcategory === "all" ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All {activeGroupData.label}
                </button>
                {activeGroupData.subcategories.map(sub => (
                  <button
                    key={sub.value}
                    onClick={() => setActiveSubcategory(sub.value)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeSubcategory === sub.value ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{sub.emoji}</span>
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ═══════ RESULTS ═══════ */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Active filters strip */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {radius !== "worldwide" && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setRadius("worldwide")}>
                <Radar className="h-3 w-3" /> {radiusLabel} <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {locationQuery && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setLocationQuery("")}>
                <MapPin className="h-3 w-3" /> {locationQuery} <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {activeSubcategory !== "all" && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setActiveSubcategory("all")}>
                {getSubcategoryInfo(activeSubcategory)?.emoji} {getSubcategoryInfo(activeSubcategory)?.label} <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearchQuery("")}>
                <Search className="h-3 w-3" /> "{searchQuery}" <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">Clear all</button>
          </div>
        )}

        {/* Geo context banner */}
        {!loading && !hasFilters && geo.detection?.city && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-accent/5 border border-accent/15">
            <LocateFixed className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm text-muted-foreground">
              Showing all listings worldwide. <button onClick={handleNearMe} className="text-accent font-semibold hover:underline">Show near {geo.detection.city}</button>
            </span>
          </motion.div>
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
          <EmptyDiscovery onClear={clearAll} hasFilters={hasFilters} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {allItems.slice(0, visibleCount).map((item, i) => (
                <motion.div key={`${item._type}-${item.id}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <ListingCard item={item} />
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

/* ═══════════════════════════════════════════
   LISTING CARD — Premium card with business details
   ═══════════════════════════════════════════ */
function ListingCard({ item }: { item: any }) {
  const type = item._type as string;

  const href = type === "seasonal"
    ? (item.slug ? `/listing/${item.slug}` : "/explore")
    : type === "real-estate"
    ? (item.slug ? `/properties/${item.slug}` : "/explore")
    : (item.booking_slug ? `/book/${item.booking_slug}` : "/explore");

  const imgSrc = type === "seasonal"
    ? (item.cover_url || PLACEHOLDER_IMG)
    : (Array.isArray(item.photo_urls) && item.photo_urls[0] ? item.photo_urls[0] : PLACEHOLDER_IMG);

  const priceLabel = type === "seasonal"
    ? `${item.price_per_night}€ / night`
    : type === "real-estate"
    ? `${Number(item.price || 0).toLocaleString()} ${item.currency || "€"}${item.listing_type === "long_term_rent" ? "/mo" : ""}`
    : item.price > 0 ? `${item.price} ${item.currency || "€"}` : "Free";

  const subInfo = getSubcategoryInfo(type === "service" ? item.category : type === "seasonal" ? "seasonal" : "real-estate");

  const typeBadge = type === "seasonal"
    ? { label: "Vacation Rental", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" }
    : type === "real-estate"
    ? { label: item.listing_type === "sale" ? "For Sale" : "Long-term Rent", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" }
    : { label: subInfo?.label || item.category?.replace(/_/g, " ") || "Service", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };

  const isVerified = type === "service" && Array.isArray(item.badges) && item.badges.includes("verified");
  const ctaLabel = type === "service" ? "Book now" : type === "real-estate" ? "View property" : "View & book";

  return (
    <Link to={href} className="group block h-full">
      <div className="h-full rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:border-accent/30 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img src={imgSrc} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
          {/* Type badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-sm ${typeBadge.color}`}>
              {subInfo?.emoji && <span>{subInfo.emoji}</span>}
              {typeBadge.label}
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-accent/90 text-accent-foreground backdrop-blur-sm">
                <CheckCircle className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
          {/* Price pill */}
          <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg">
            <span className="text-sm font-bold text-foreground">{priceLabel}</span>
          </div>
          {type === "real-estate" && item.views_count > 0 && (
            <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> {item.views_count}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-1.5 min-h-[130px]">
          <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">
            {item.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-accent/70" />
            <span className="truncate">{item.city}{item.country ? `, ${item.country.toUpperCase()}` : ""}</span>
          </div>

          {/* Category tag */}
          {type === "service" && subInfo && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>{subInfo.emoji}</span>
              <span className="font-medium">{subInfo.label}</span>
            </div>
          )}

          {/* Type-specific meta */}
          {type === "seasonal" && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.max_guests && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.max_guests} guests</span>}
              {item.min_nights && <span className="flex items-center gap-1"><Moon className="h-3 w-3" />min {item.min_nights}n</span>}
            </div>
          )}
          {type === "real-estate" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {item.surface_sqm > 0 && <span>{item.surface_sqm} m²</span>}
              {item.rooms > 0 && <span>• {item.rooms} rooms</span>}
              {item.bedrooms > 0 && <span>• {item.bedrooms} bed</span>}
            </div>
          )}

          {/* CTA */}
          <div className="pt-2 mt-auto">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent group-hover:gap-2.5 transition-all px-3 py-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/15">
              {ctaLabel} <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ═══════ Empty state ═══════ */
function EmptyDiscovery({ onClear, hasFilters }: { onClear: () => void; hasFilters: boolean }) {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-muted/50 flex items-center justify-center">
        <Search className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-xl font-bold text-foreground">No listings found</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Try adjusting your search, expanding the radius, or explore different categories. New listings are published every day from around the world!
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onClear} className="rounded-full gap-2 mt-2">
          <X className="h-4 w-4" /> Clear all filters
        </Button>
      )}
      <div className="pt-6">
        <Link to="/signup">
          <Button className="rounded-full gap-2 px-8">
            <Sparkles className="h-4 w-4" /> List your service or property
          </Button>
        </Link>
      </div>
    </div>
  );
}
