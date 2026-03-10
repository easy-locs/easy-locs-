import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import AppLogo from "@/components/AppLogo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, MapPin, Globe, Home, Sun, Briefcase, ArrowRight, Eye,
  Users, Moon, SlidersHorizontal, X, Building2, Waves, Car, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

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
  // Enriched from property
  city?: string; country?: string; cover_url?: string | null;
}

interface ServiceListing {
  id: string; title: string; description: string; category: string; city: string;
  country: string; price: number; currency: string; photo_urls: any;
  booking_slug: string; active: boolean;
}

/* ─────────── Constants ─────────── */
const RE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  sale: { label: "For Sale", icon: "🏷️" },
  long_term_rent: { label: "Long-term Rent", icon: "🏠" },
};

const SERVICE_CATEGORIES: Record<string, string> = {
  cleaning: "🧹 Cleaning",
  maintenance: "🔧 Maintenance",
  transport: "🚗 Transport",
  car_rental: "🚙 Car Rental",
  tours: "🗺️ Tours & Activities",
  airport_transfer: "✈️ Airport Transfer",
  personal_services: "💇 Personal Services",
  wellness: "💆 Wellness / Spa",
  water_sport: "🏄 Water Sport",
  restaurant: "🍽️ Restaurant",
  coworking: "💻 Coworking",
  events: "🎫 Events / Tickets",
  other: "📦 Other",
};

const PLACEHOLDER_IMG = "/placeholder.svg";

/* ─────────── Component ─────────── */
export default function Explore() {
  const [tab, setTab] = useState("seasonal");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [filtersVisible, setFiltersVisible] = useState(false);

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

      // Enrich seasonal listings with property data via secure RPC
      const rawListings = (seaRes.data || []) as any[];
      const propertyIds = [...new Set(rawListings.map(l => l.property_id))];
      let propMap: Record<string, any> = {};
      if (propertyIds.length > 0) {
        const { data: props } = await supabase.rpc("get_public_listing_properties", {
          p_property_ids: propertyIds,
        });
        if (props) {
          for (const p of props as any[]) propMap[p.id] = p;
        }
      }
      setSeasonal(rawListings.map(l => {
        const prop = propMap[l.property_id];
        const photos = Array.isArray(prop?.photo_urls) ? prop.photo_urls : [];
        return {
          ...l,
          city: prop?.city || "",
          country: prop?.country || "",
          cover_url: photos[0] || null,
        };
      }));
      setLoading(false);
    };
    load();
  }, []);

  // Aggregate countries / cities for filters
  const allCountries = useMemo(() => {
    const set = new Set<string>();
    realEstate.forEach(l => l.country && set.add(l.country));
    seasonal.forEach(l => l.country && set.add(l.country));
    services.forEach(l => l.country && set.add(l.country));
    return Array.from(set).sort();
  }, [realEstate, seasonal, services]);

  // Filtered data
  const matchText = (item: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (item.title || "").toLowerCase().includes(q) ||
      (item.city || "").toLowerCase().includes(q) ||
      (item.country || "").toLowerCase().includes(q);
  };
  const matchCountry = (item: any) => countryFilter === "all" || item.country === countryFilter;
  const matchCity = (item: any) => !cityFilter || (item.city || "").toLowerCase().includes(cityFilter.toLowerCase());

  const filteredRE = useMemo(() => realEstate.filter(l =>
    matchText(l) && matchCountry(l) && matchCity(l) &&
    (typeFilter === "all" || l.listing_type === typeFilter)
  ), [realEstate, search, countryFilter, cityFilter, typeFilter]);

  const filteredSeasonal = useMemo(() => seasonal.filter(l =>
    matchText(l) && matchCountry(l) && matchCity(l)
  ), [seasonal, search, countryFilter, cityFilter]);

  const filteredServices = useMemo(() => services.filter(l =>
    matchText(l) && matchCountry(l) && matchCity(l) &&
    (typeFilter === "all" || l.category === typeFilter)
  ), [services, search, countryFilter, cityFilter, typeFilter]);

  const counts = {
    realEstate: filteredRE.length,
    seasonal: filteredSeasonal.length,
    services: filteredServices.length,
  };

  const clearFilters = () => {
    setSearch(""); setCountryFilter("all"); setCityFilter(""); setTypeFilter("all");
  };

  const hasActiveFilters = search || countryFilter !== "all" || cityFilter || typeFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Explore — Real Estate, Rentals & Services Worldwide | Easy-Locs"
        description="Discover properties for sale, vacation rentals, and local services worldwide. Browse verified listings from trusted hosts and providers on Easy-Locs."
        canonical="https://www.easy-locs.com/explore"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <AppLogo variant="header" linkTo="/" />
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              Log in
            </Link>
            <Link to="/signup" className="text-sm font-semibold px-4 py-1.5 rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
              <Sparkles className="h-3 w-3" /> Live worldwide listings
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
              Explore the world of <span className="text-accent">Easy-Locs</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Properties, vacation rentals, and services — all published live by verified hosts and professionals.
            </p>
          </motion.div>

          {/* Search bar */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by city, country, or keyword..."
                className="pl-12 pr-12 h-12 rounded-2xl text-base border-border bg-card shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          {/* Tab triggers */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
              <TabsTrigger value="seasonal" className="rounded-lg px-4 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Sun className="h-4 w-4" />
                <span>Seasonal</span>
                <Badge variant="secondary" className="ml-1 text-[10px] h-5">{counts.seasonal}</Badge>
              </TabsTrigger>
              <TabsTrigger value="real-estate" className="rounded-lg px-4 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Home className="h-4 w-4" />
                <span>Real Estate</span>
                <Badge variant="secondary" className="ml-1 text-[10px] h-5">{counts.realEstate}</Badge>
              </TabsTrigger>
              <TabsTrigger value="services" className="rounded-lg px-4 py-2 text-sm gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Briefcase className="h-4 w-4" />
                <span>Services</span>
                <Badge variant="secondary" className="ml-1 text-[10px] h-5">{counts.services}</Badge>
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline" size="sm"
              onClick={() => setFiltersVisible(v => !v)}
              className="rounded-xl gap-2 self-start"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">!</Badge>}
            </Button>
          </div>

          {/* Filters bar */}
          {filtersVisible && (
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-muted/30 rounded-xl border border-border animate-in fade-in slide-in-from-top-2 duration-200">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-40 rounded-xl h-9 text-sm">
                  <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {allCountries.map(c => (
                    <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                placeholder="City..."
                className="w-36 rounded-xl h-9 text-sm"
              />

              {tab === "real-estate" && (
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-44 rounded-xl h-9 text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="long_term_rent">Long-term Rent</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {tab === "services" && (
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48 rounded-xl h-9 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {Object.entries(SERVICE_CATEGORIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 h-9">
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
          )}

          {/* ═══ Seasonal Tab ═══ */}
          <TabsContent value="seasonal" className="mt-0">
            {loading ? <GridSkeleton /> : filteredSeasonal.length === 0 ? <EmptyState label="seasonal rentals" /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredSeasonal.map(l => (
                  <Link key={l.id} to={l.slug ? `/listing/${l.slug}` : "#"} className="group h-full">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all duration-300 h-full flex flex-col">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted shrink-0">
                        <img
                          src={l.cover_url || PLACEHOLDER_IMG}
                          alt={l.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-accent text-accent-foreground text-[10px] font-bold shadow-lg">
                            🏖️ Seasonal
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1 text-sm font-bold text-foreground shadow-sm">
                          {l.price_per_night}€<span className="text-[10px] font-normal text-muted-foreground">/night</span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1 min-h-[140px]">
                        <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">
                          {l.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{l.city}{l.country ? `, ${l.country.toUpperCase()}` : ""}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{l.max_guests || "—"}</span>
                          <span className="flex items-center gap-1"><Moon className="h-3 w-3" />min {l.min_nights || 1}n</span>
                        </div>
                        <div className="pt-2 mt-auto border-t border-border">
                          <span className="text-xs font-medium text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                            View & Book <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ Real Estate Tab ═══ */}
          <TabsContent value="real-estate" className="mt-0">
            {loading ? <GridSkeleton /> : filteredRE.length === 0 ? <EmptyState label="real estate listings" /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredRE.map(l => {
                  const photos = Array.isArray(l.photo_urls) ? l.photo_urls : [];
                  const cfg = RE_TYPE_LABELS[l.listing_type] || { label: l.listing_type, icon: "🏠" };
                  return (
                    <Link key={l.id} to={`/properties/${l.slug}`} className="group h-full">
                      <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all duration-300 h-full flex flex-col">
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted shrink-0">
                          <img
                            src={photos[0] || PLACEHOLDER_IMG}
                            alt={l.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-bold shadow-sm border border-border">
                              {cfg.icon} {cfg.label}
                            </Badge>
                          </div>
                          {l.views_count > 0 && (
                            <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {l.views_count}
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex flex-col flex-1 min-h-[140px]">
                          <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">
                            {l.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{l.city}{l.country ? `, ${l.country.toUpperCase()}` : ""}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                            {l.surface_sqm > 0 && <span>{l.surface_sqm} m²</span>}
                            {l.rooms > 0 && <span>{l.rooms} rooms</span>}
                            {l.bedrooms > 0 && <span>{l.bedrooms} bed</span>}
                          </div>
                          <div className="flex items-center justify-between pt-2 mt-auto border-t border-border">
                            <span className="text-sm font-bold text-foreground">
                              {l.price.toLocaleString()} {l.currency || "€"}
                              {l.listing_type === "long_term_rent" && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                            </span>
                            <ArrowRight className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ Services Tab ═══ */}
          <TabsContent value="services" className="mt-0">
            {loading ? <GridSkeleton /> : filteredServices.length === 0 ? <EmptyState label="services" /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredServices.map(l => {
                  const photos = Array.isArray(l.photo_urls) ? l.photo_urls : [];
                  const catLabel = SERVICE_CATEGORIES[l.category] || l.category;
                  return (
                    <Link key={l.id} to={l.booking_slug ? `/book/${l.booking_slug}` : "#"} className="group h-full">
                      <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all duration-300 h-full flex flex-col">
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted shrink-0">
                          <img
                            src={photos[0] || PLACEHOLDER_IMG}
                            alt={l.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-accent/90 text-accent-foreground text-[10px] font-bold shadow-lg backdrop-blur-sm">
                              {catLabel}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col flex-1 min-h-[140px]">
                          <h3 className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-accent transition-colors">
                            {l.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{l.city}{l.country ? `, ${l.country.toUpperCase()}` : ""}</span>
                          </div>
                          {l.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{l.description}</p>
                          )}
                          <div className="flex items-center justify-between pt-2 mt-auto border-t border-border">
                            <span className="text-sm font-bold text-foreground">
                              {l.price > 0 ? `${l.price} ${l.currency || "€"}` : "Free"}
                            </span>
                            <span className="text-xs font-medium text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                              Book <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
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

/* ─── Helpers ─── */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
        <Search className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">No {label} found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Try adjusting your filters or search terms. New listings are published every day!
      </p>
    </div>
  );
}
