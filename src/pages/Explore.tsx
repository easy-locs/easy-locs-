import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import AppLogo from "@/components/AppLogo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, MapPin, Globe, Home, Sun, Briefcase, ArrowRight, Eye,
  Users, Moon, SlidersHorizontal, X, Building2, Waves, Car, Sparkles,
  Heart, Star, ChevronDown, Filter, Loader2, CalendarDays,
  Wrench, Utensils, Dumbbell, Scale, Laptop, PartyPopper, Palmtree,
  Plane, Scissors, ShoppingBag, Navigation, LocateFixed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGeoDetect } from "@/hooks/useGeoDetect";

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
  booking_slug: string; active: boolean;
}

/* ─────────── Category config ─────────── */
const CATEGORY_ICONS: { key: string; label: string; icon: React.ElementType; emoji: string }[] = [
  { key: "all", label: "All", icon: Globe, emoji: "🌍" },
  { key: "seasonal", label: "Vacation Rentals", icon: Sun, emoji: "🏖️" },
  { key: "real-estate", label: "Properties", icon: Home, emoji: "🏠" },
  { key: "cleaning", label: "Cleaning", icon: Sparkles, emoji: "🧹" },
  { key: "transport", label: "Transport", icon: Car, emoji: "🚗" },
  { key: "airport_transfer", label: "Transfers", icon: Plane, emoji: "✈️" },
  { key: "tours", label: "Tours", icon: Palmtree, emoji: "🗺️" },
  { key: "water_sport", label: "Water Sports", icon: Waves, emoji: "🏄" },
  { key: "sports_coach", label: "Fitness", icon: Dumbbell, emoji: "🏋️" },
  { key: "restaurant", label: "Food & Dining", icon: Utensils, emoji: "🍽️" },
  { key: "coworking", label: "Coworking", icon: Laptop, emoji: "💻" },
  { key: "construction", label: "Renovation", icon: Wrench, emoji: "🏗️" },
  { key: "legal", label: "Legal", icon: Scale, emoji: "⚖️" },
  { key: "spa", label: "Wellness", icon: Heart, emoji: "🧖" },
  { key: "event", label: "Events", icon: PartyPopper, emoji: "🎫" },
  { key: "personal", label: "Personal", icon: Scissors, emoji: "💆" },
  { key: "business_services", label: "Business", icon: Briefcase, emoji: "💼" },
];

const SERVICE_CATEGORY_KEYS = [
  "cleaning", "maintenance", "construction", "transport", "car_rental",
  "airport_transfer", "tours", "water_sport", "spa", "sports_coach",
  "restaurant", "coworking", "legal", "business_services", "consulting",
  "personal", "event", "other",
];

const PLACEHOLDER_IMG = "/placeholder.svg";

/* ─────────── Component ─────────── */
export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ITEMS_PER_PAGE = 24;
  const geo = useGeoDetect();

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [locationQuery, setLocationQuery] = useState(searchParams.get("location") || "");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "all");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  // Data
  const [realEstate, setRealEstate] = useState<RealEstateListing[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalListing[]>([]);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [reRes, seaRes, svcRes] = await Promise.all([
        supabase.rpc("get_public_real_estate_listings", { p_limit: 100 }),
        supabase.from("public_listings").select("*").eq("active", true).order("created_at", { ascending: false }).limit(100),
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

  // Filtering
  const matchText = useCallback((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (item.title || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q);
  }, [searchQuery]);

  const matchLocation = useCallback((item: any) => {
    if (!locationQuery) return true;
    const q = locationQuery.toLowerCase();
    return (item.city || "").toLowerCase().includes(q) ||
      (item.country || "").toLowerCase().includes(q);
  }, [locationQuery]);

  const allItems = useMemo(() => {
    const items: Array<any & { _type: string }> = [];

    if (activeCategory === "all" || activeCategory === "seasonal") {
      seasonal.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "seasonal" }));
    }
    if (activeCategory === "all" || activeCategory === "real-estate") {
      realEstate.filter(l => matchText(l) && matchLocation(l)).forEach(l => items.push({ ...l, _type: "real-estate" }));
    }
    if (activeCategory === "all" || SERVICE_CATEGORY_KEYS.includes(activeCategory)) {
      services.filter(l => matchText(l) && matchLocation(l) && (activeCategory === "all" || l.category === activeCategory)).forEach(l => items.push({ ...l, _type: "service" }));
    }

    return items;
  }, [seasonal, realEstate, services, activeCategory, matchText, matchLocation]);

  // Aggregate unique locations for autocomplete hints
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

  // Location suggestions filtered by current input
  const locationSuggestions = useMemo(() => {
    const q = locationQuery.toLowerCase().trim();
    const suggestions: { label: string; type: "geo" | "city" | "country" }[] = [];

    // "Near me" option using geolocation
    if (geo.detection?.city && (!q || "near me".includes(q) || geo.detection.city.toLowerCase().includes(q))) {
      suggestions.push({ label: `📍 Near me — ${geo.detection.city}, ${geo.country.toUpperCase()}`, type: "geo" });
    }

    // Cities
    allCities.filter(c => !q || c.toLowerCase().includes(q)).slice(0, 6).forEach(c => {
      suggestions.push({ label: c, type: "city" });
    });

    // Countries
    allCountries.filter(c => !q || c.toLowerCase().includes(q)).slice(0, 4).forEach(c => {
      suggestions.push({ label: c.toUpperCase(), type: "country" });
    });

    return suggestions.slice(0, 8);
  }, [locationQuery, allCities, allCountries, geo.detection, geo.country]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectLocation = (suggestion: { label: string; type: string }) => {
    if (suggestion.type === "geo" && geo.detection?.city) {
      setLocationQuery(geo.detection.city);
    } else {
      setLocationQuery(suggestion.label);
    }
    setShowLocationSuggestions(false);
  };

  const handleNearMe = () => {
    if (geo.detection?.city) {
      setLocationQuery(geo.detection.city);
    } else if (geo.country) {
      setLocationQuery(geo.country);
    }
  };

  const totalCounts = {
    all: seasonal.length + realEstate.length + services.length,
    seasonal: seasonal.length,
    "real-estate": realEstate.length,
  };

  // Reset pagination on filter changes
  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [activeCategory, searchQuery, locationQuery]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (locationQuery) params.set("location", locationQuery);
    if (activeCategory !== "all") params.set("category", activeCategory);
    setSearchParams(params);
    setShowLocationSuggestions(false);
  };

  const clearAll = () => {
    setSearchQuery(""); setLocationQuery(""); setActiveCategory("all"); setVisibleCount(ITEMS_PER_PAGE);
    setSearchParams({});
  };

  const hasFilters = !!(searchQuery || locationQuery || activeCategory !== "all");

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

            {/* Desktop search bar — Airbnb style */}
            <div className="hidden md:flex items-center flex-1 max-w-2xl mx-8">
              <div className="flex items-center w-full bg-card border border-border rounded-full shadow-sm hover:shadow-md transition-shadow">
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
                <div className="flex-1 px-5 py-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Where</label>
                  <Input
                    value={locationQuery}
                    onChange={e => setLocationQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="City, country..."
                    className="border-0 p-0 h-6 text-sm bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="shrink-0 w-10 h-10 mr-1.5 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mobile search trigger */}
            <button
              onClick={() => setShowMobileSearch(v => !v)}
              className="md:hidden flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card shadow-sm text-sm text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="truncate max-w-[140px]">{searchQuery || locationQuery || "Search..."}</span>
            </button>

            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
                Log in
              </Link>
              <Link to="/signup" className="text-sm font-semibold px-4 py-2 rounded-full bg-accent text-accent-foreground hover:opacity-90 transition-opacity">
                Sign up
              </Link>
            </div>
          </div>

          {/* Mobile search panel */}
          <AnimatePresence>
            {showMobileSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden overflow-hidden pb-4"
              >
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="What are you looking for?"
                      className="pl-10 rounded-xl"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={locationQuery}
                      onChange={e => setLocationQuery(e.target.value)}
                      placeholder="City or country"
                      className="pl-10 rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => { handleSearch(); setShowMobileSearch(false); }} className="flex-1 rounded-xl gap-2">
                      <Search className="h-4 w-4" /> Search
                    </Button>
                    {hasFilters && (
                      <Button variant="outline" onClick={clearAll} className="rounded-xl">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════ CATEGORY BAR — Airbnb style icon strip ═══════ */}
        <div className="border-t border-border/50">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-3 -mx-1">
              {CATEGORY_ICONS.map(cat => {
                const isActive = activeCategory === cat.key;
                const count = cat.key === "all" ? totalCounts.all
                  : cat.key === "seasonal" ? totalCounts.seasonal
                  : cat.key === "real-estate" ? totalCounts["real-estate"]
                  : undefined;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all min-w-[64px] min-h-[56px] ${
                      isActive
                        ? "text-foreground border-b-2 border-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <cat.icon className={`h-5 w-5 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
                    <span className="truncate max-w-[72px] leading-none">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ RESULTS ═══════ */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {loading ? "Loading..." : `${allItems.length} listing${allItems.length !== 1 ? "s" : ""}`}
            </h2>
            {hasFilters && (
              <button onClick={clearAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
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
                <motion.div
                  key={`${item._type}-${item.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <ListingCard item={item} />
                </motion.div>
              ))}
            </div>

            {visibleCount < allItems.length && (
              <div className="flex justify-center pt-10">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount(c => c + ITEMS_PER_PAGE)}
                  className="rounded-full gap-2 px-8 min-h-[48px] shadow-sm hover:shadow-md transition-shadow"
                >
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
   LISTING CARD — Premium unified card
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
    : item.price > 0
    ? `${item.price} ${item.currency || "€"}`
    : "Free";

  const typeBadge = type === "seasonal"
    ? { label: "Vacation Rental", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" }
    : type === "real-estate"
    ? { label: item.listing_type === "sale" ? "For Sale" : "Long-term Rent", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" }
    : { label: item.category?.replace(/_/g, " ") || "Service", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };

  return (
    <Link to={href} className="group block h-full">
      <div className="h-full rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl hover:border-accent/30 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={imgSrc}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-sm ${typeBadge.color}`}>
              {typeBadge.label}
            </span>
          </div>
          {/* Price pill */}
          <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg">
            <span className="text-sm font-bold text-foreground">{priceLabel}</span>
          </div>
          {/* Views for real estate */}
          {type === "real-estate" && item.views_count > 0 && (
            <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> {item.views_count}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 min-h-[120px]">
          <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">
            {item.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-accent/70" />
            <span className="truncate">
              {item.city}{item.country ? `, ${item.country.toUpperCase()}` : ""}
            </span>
          </div>

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
          {type === "service" && item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          )}

          {/* CTA */}
          <div className="pt-2 mt-auto">
            <span className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
              {type === "service" ? "Book now" : "View details"} <ArrowRight className="h-3 w-3" />
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
        Try adjusting your search or explore different categories. New listings are published every day from around the world!
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
