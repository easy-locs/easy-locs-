import { heroCover, bannerCover } from "@/lib/image/category-covers";
import { useState, useCallback, useEffect, useRef } from "react";
import { getVerticalTheme } from "@/lib/discovery/vertical-themes";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, MapPin, SlidersHorizontal, ArrowLeft,
  BedDouble, Bath, Building2, Maximize2,
  TrendingUp, Sparkles, Home, ChevronRight, Map as MapIcon, List, GitCompareArrows, X,
  Heart, Loader2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import PropertyBuyCard from "@/components/cards/PropertyBuyCard";
import PropertyRentCard from "@/components/cards/PropertyRentCard";
import PropertyProjectCard from "@/components/cards/PropertyProjectCard";
import { FALLBACK_PROPERTIES } from "@/data/fallback-properties";
import { realEstatePropertyService } from "@/services/real-estate.service";
import type { Property } from "@/domains/real-estate/canonical-types";
import { tc } from "@/lib/i18n-canonical";
import StoryPreviewRail from "@/components/stories/StoryPreviewRail";
import { useStoryFeed } from "@/hooks/useStoryFeed";
import { useUiEngine } from "@/hooks/useUiEngine";
import { PropertyMapView } from "@/components/property/PropertyMapView";
import { PropertyComparePanel } from "@/components/property/PropertyComparePanel";
import SubPageShell from "@/components/layout/SubPageShell";
import { useAuth } from "@/contexts/AuthContext";
import { insertSavedListing, deleteSavedListing, fetchSavedListings } from "@/repositories/public.repository";

type PropertyTab = "buy" | "rent" | "projects";
type SortMode = "relevance" | "price_asc" | "price_desc" | "newest" | "size";

const TABS: { key: PropertyTab; label: string; emoji: string }[] = [
  { key: "buy", label: "Buy", emoji: "🔑" },
  { key: "rent", label: "Rent", emoji: "🏢" },
  { key: "projects", label: "Projects", emoji: "🏗️" },
];

const BUY_CHIPS = [
  { value: null, label: "All" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "penthouse", label: "Penthouse" },
  { value: "office", label: "Office" },
  { value: "commercial", label: "Commercial" },
  { value: "residential_land", label: "Land" },
];

const RENT_CHIPS = [
  { value: null, label: "All" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "penthouse", label: "Penthouse" },
  { value: "office", label: "Office" },
  { value: "commercial", label: "Commercial" },
];

const PROJECT_CHIPS = [
  { value: null, label: "All" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
];

function getChips(tab: PropertyTab) {
  if (tab === "buy") return BUY_CHIPS;
  if (tab === "rent") return RENT_CHIPS;
  return PROJECT_CHIPS;
}

function getPlaceholder(tab: PropertyTab) {
  if (tab === "buy") return "Search by area, building, developer...";
  if (tab === "rent") return "Search by area, tower, community...";
  return "Search projects, developers, areas...";
}

function getListingType(tab: PropertyTab): string {
  if (tab === "buy") return "sale";
  if (tab === "rent") return "rent";
  return "project";
}

function PropertyStorySection({ tab }: { tab: PropertyTab }) {
  const feedKey = tab === "buy" ? "property_buy" : tab === "rent" ? "property_rent" : "property_projects";
  const { data: stories = [] } = useStoryFeed(feedKey);
  const title = tab === "buy" ? "Featured for sale" : tab === "rent" ? "Popular rentals" : "Featured projects";
  if (!stories.length) return null;
  return <StoryPreviewRail title={title} stories={stories.slice(0, 8)} size="small" feedKey={feedKey} surface="property_hub" />;
}

type DisplayIntent = "buy" | "rent" | "project";

function getIntent(p: Property): DisplayIntent {
  if (p.listingType === "rent" || p.listingType === "lease") return "rent";
  if (p.listingType === "short_stay" || p.listingType === "long_stay" || p.isOffPlan || p.developer) return "project";
  return "buy";
}

function getSubcategory(p: Property, intent: DisplayIntent): string {
  if (intent === "buy") return `buy_${p.propertyType}`;
  if (intent === "rent") return `rent_${p.propertyType}`;
  if (p.propertyCategory === "investment") return "investment";
  return p.isOffPlan ? "offplan" : "developer_project";
}

function getDisplayImage(p: Property): string {
  const url = (p.mediaIds || []).find(id => id.startsWith("http") || id.startsWith("/"));
  return url ?? bannerCover(`buy_${p.propertyType}`);
}

function getSizeSqft(p: Property): number {
  if (!p.area) return 0;
  return Math.round(p.area * (p.areaUnit === "sqm" ? 10.764 : 1));
}

function getRankingScore(p: Property): number {
  return p.rankingScore ?? p.qualityScore ?? 50;
}

interface Filters {
  country: string;
  city: string;
  district: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  minArea: string;
  maxArea: string;
  furnished: boolean;
}

const EMPTY_FILTERS: Filters = {
  country: "", city: "", district: "", minPrice: "", maxPrice: "",
  bedrooms: "", bathrooms: "", minArea: "", maxArea: "", furnished: false,
};

export default function PropertyHub() {
  useUiEngine("property-propertyhub");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<PropertyTab>("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("relevance");
  const [dbProperties, setDbProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [usingFallback, setUsingFallback] = useState(false);
  const [dbIsEmpty, setDbIsEmpty] = useState<boolean | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const PAGE_SIZE = 20;

  useEffect(() => {
    realEstatePropertyService.fetchPublished({ pageSize: 1, offset: 0 })
      .then(r => setDbIsEmpty(r.total === 0))
      .catch(() => setDbIsEmpty(true));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchSavedListings(user.id).then(saved => {
      setSavedIds(new Set(saved.map(s => s.listing_id)));
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  const loadProperties = useCallback(async (newOffset: number, append: boolean = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const listingType = getListingType(activeTab);

      const result = await realEstatePropertyService.fetchPublished({
          listingType: listingType,
          propertyType: activeChip || undefined,
          country: filters.country || undefined,
          city: filters.city || undefined,
          district: filters.district || undefined,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          minBedrooms: filters.bedrooms ? Number(filters.bedrooms) : undefined,
          minBathrooms: filters.bathrooms ? Number(filters.bathrooms) : undefined,
          minArea: filters.minArea ? Number(filters.minArea) : undefined,
          maxArea: filters.maxArea ? Number(filters.maxArea) : undefined,
          furnished: filters.furnished || undefined,
          search: debouncedSearch || undefined,
          sortBy: sortBy,
          pageSize: PAGE_SIZE,
          offset: newOffset,
        });

      if (result.data.length === 0 && newOffset === 0 && dbIsEmpty) {
        setDbProperties(FALLBACK_PROPERTIES);
        setTotalCount(FALLBACK_PROPERTIES.length);
        setUsingFallback(true);
      } else {
        if (append) {
          setDbProperties(prev => [...prev, ...result.data]);
        } else {
          setDbProperties(result.data);
        }
        setTotalCount(result.total);
        setUsingFallback(false);
      }
    } catch (err) {
      console.warn("[PropertyHub] DB fetch failed", err);
      if (newOffset === 0) {
        setDbProperties([]);
        setTotalCount(0);
        setUsingFallback(false);
      }
    }

    setLoading(false);
    setLoadingMore(false);
  }, [activeTab, activeChip, debouncedSearch, sortBy, filters, dbIsEmpty]);

  useEffect(() => {
    setOffset(0);
    loadProperties(0, false);
  }, [loadProperties]);

  const listings = dbProperties;

  const handleLoadMore = useCallback(() => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    loadProperties(newOffset, true);
  }, [offset, loadProperties]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
  }, []);

  const toggleFavorite = useCallback(async (item: Property) => {
    if (!user?.id) return;
    const isSaved = savedIds.has(item.id);
    try {
      if (isSaved) {
        await deleteSavedListing(user.id, item.id);
        setSavedIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
      } else {
        await insertSavedListing({
          user_id: user.id,
          listing_type: "property",
          listing_id: item.id,
          listing_title: item.title,
          listing_image: getDisplayImage(item),
          listing_city: item.address.city,
          listing_country: item.address.country,
          listing_price: item.price,
          listing_currency: item.currency,
        });
        setSavedIds(prev => new Set(prev).add(item.id));
      }
    } catch (err) {
      console.warn("[PropertyHub] Save toggle failed", err);
    }
  }, [user?.id, savedIds]);

  const chips = getChips(activeTab);
  const hasMore = !usingFallback && listings.length < totalCount;

  const handleTabChange = useCallback((tab: PropertyTab) => {
    setActiveTab(tab);
    setActiveChip(null);
    setSearchQuery("");
    setDebouncedSearch("");
    setOffset(0);
    setFilters(EMPTY_FILTERS);
  }, []);

  const updateFilter = useCallback((key: keyof Filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOffset(0);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setOffset(0);
  }, []);

  const hasActiveFilters = filters.country || filters.city || filters.district || filters.minPrice || filters.maxPrice ||
    filters.bedrooms || filters.bathrooms || filters.minArea || filters.maxArea || filters.furnished;

  return (
    <SubPageShell>
      <SEOHead
        title="Property — Buy, Rent & Invest | Easy-Locs"
        description="Find apartments, villas, townhouses for sale or rent. Explore off-plan projects and investment opportunities across UAE."
      />

      <div className="relative overflow-hidden" style={{ height: 320 }}>
        <PropertyHeroVideo />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, hsl(228 28% 7% / 0.3) 0%, hsl(228 28% 7% / 0.55) 40%, hsl(228 28% 7% / 0.92) 100%)"
        }} />

        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 60%, hsla(200,60%,55%,0.05), transparent 70%)" }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <div className="relative z-10 px-4 pt-12 pb-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl mb-5 active:scale-90 transition-transform"
              style={{ background: "hsla(0,0%,100%,0.1)", border: "1px solid hsla(0,0%,100%,0.08)" }}
            >
              <ArrowLeft className="h-4 w-4 text-white" />
            </button>

            <h1 className="text-[1.75rem] font-bold text-white tracking-tight leading-tight">
              Property
            </h1>
            <p className="text-[0.8125rem] text-white/55 mt-1 font-medium">
              Buy, rent & invest — 0% fees for clients
            </p>
          </motion.div>

          <motion.div
            className="mt-4 flex rounded-2xl p-1 backdrop-blur-xl"
            style={{
              background: "hsla(0,0%,100%,0.08)",
              border: "1px solid hsla(0,0%,100%,0.1)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[0.8125rem] font-bold transition-all"
                style={{
                  background: activeTab === tab.key ? "hsla(0,0%,100%,0.15)" : "transparent",
                  color: activeTab === tab.key ? "white" : "hsla(0,0%,100%,0.5)",
                  boxShadow: activeTab === tab.key ? "0 2px 8px hsla(0,0%,0%,0.2)" : "none",
                }}
              >
                <span>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </motion.div>

          <motion.div
            className="mt-3 relative flex gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/35" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getPlaceholder(activeTab)}
                className="pl-10 h-12 text-[0.8125rem] rounded-xl border-white/8 bg-white/6 text-white placeholder:text-white/28 focus:border-white/25 focus:bg-white/10 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{
                background: showFilters || hasActiveFilters ? "hsl(var(--primary))" : "hsla(0,0%,100%,0.08)",
                border: "1px solid hsla(0,0%,100%,0.1)",
              }}
            >
              <SlidersHorizontal className="h-4 w-4 text-white" />
            </button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
          >
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">Filters</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[0.6875rem] text-primary font-semibold">Clear all</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">Country</label>
                  <select
                    value={filters.country}
                    onChange={(e) => updateFilter("country", e.target.value)}
                    className="w-full h-9 px-2 text-xs rounded-lg border bg-background text-foreground"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    <option value="">All Countries</option>
                    <option value="AE">UAE</option>
                    <option value="FR">France</option>
                    <option value="US">USA</option>
                    <option value="GB">UK</option>
                    <option value="SA">Saudi Arabia</option>
                    <option value="MA">Morocco</option>
                    <option value="EG">Egypt</option>
                    <option value="DE">Germany</option>
                    <option value="TR">Turkey</option>
                    <option value="ES">Spain</option>
                  </select>
                </div>
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">City</label>
                  <Input
                    value={filters.city}
                    onChange={(e) => updateFilter("city", e.target.value)}
                    placeholder="e.g. Dubai"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">District</label>
                  <Input
                    value={filters.district}
                    onChange={(e) => updateFilter("district", e.target.value)}
                    placeholder="e.g. Marina"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">Min Price</label>
                  <Input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => updateFilter("minPrice", e.target.value)}
                    placeholder="0"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">Max Price</label>
                  <Input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => updateFilter("maxPrice", e.target.value)}
                    placeholder="No max"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">Beds</label>
                  <select
                    value={filters.bedrooms}
                    onChange={(e) => updateFilter("bedrooms", e.target.value)}
                    className="w-full h-9 px-2 text-xs rounded-lg border bg-background text-foreground"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                </div>
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">Baths</label>
                  <select
                    value={filters.bathrooms}
                    onChange={(e) => updateFilter("bathrooms", e.target.value)}
                    className="w-full h-9 px-2 text-xs rounded-lg border bg-background text-foreground"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">Min m²</label>
                  <Input
                    type="number"
                    value={filters.minArea}
                    onChange={(e) => updateFilter("minArea", e.target.value)}
                    placeholder="0"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[0.625rem] text-muted-foreground font-semibold uppercase mb-1 block">Max m²</label>
                  <Input
                    type="number"
                    value={filters.maxArea}
                    onChange={(e) => updateFilter("maxArea", e.target.value)}
                    placeholder="∞"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.furnished}
                  onChange={(e) => updateFilter("furnished", e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-foreground font-medium">Furnished only</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PropertyStorySection tab={activeTab} />

      <div className="px-4 mb-3">
        <Link
          to="/real-estate/dubai-analytics"
          className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, hsl(226 24% 14%), hsl(226 24% 20%))",
            border: "1px solid hsla(45,93%,58%,0.2)",
          }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "hsla(45,93%,58%,0.15)" }}>
            <TrendingUp className="h-4 w-4" style={{ color: "hsl(45 93% 58%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.8125rem] font-bold text-white">{tc("dld.hub_cta_title")}</p>
            <p className="text-[0.625rem] text-white/50">{tc("dld.hub_cta_subtitle")}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
        </Link>
      </div>

      <div className="px-4 -mt-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {chips.map(chip => (
            <button
              key={chip.value ?? "all"}
              onClick={() => { setActiveChip(chip.value); setOffset(0); }}
              className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
              style={{
                background: activeChip === chip.value
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted))",
                color: activeChip === chip.value
                  ? "hsl(var(--primary-foreground))"
                  : "hsl(var(--muted-foreground))",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[0.8125rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            {usingFallback ? `${listings.length} demo listings` : `${totalCount} ${totalCount === 1 ? "listing" : "listings"}`}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
              <button
                onClick={() => setViewMode("list")}
                className="px-2 py-1.5 transition-colors"
                style={{
                  background: viewMode === "list" ? "hsl(var(--primary))" : "hsl(var(--card))",
                  color: viewMode === "list" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className="px-2 py-1.5 transition-colors"
                style={{
                  background: viewMode === "map" ? "hsl(var(--primary))" : "hsl(var(--card))",
                  color: viewMode === "map" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                <MapIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortMode); setOffset(0); }}
              className="text-xs px-2 py-1.5 rounded-lg border"
              style={{
                background: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="size">Largest First</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-2xl animate-pulse bg-muted" />
            ))}
          </div>
        ) : viewMode === "map" ? (
          <PropertyMapView
            properties={listings}
            onSelectProperty={(id) => {
              const prop = listings.find(p => p.id === id);
              navigate(`/real-estate-listing/${prop?.slug || id}`);
            }}
          />
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${activeChip}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {listings.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.3 }}
                    className="relative"
                  >
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                      {user && (
                        <button
                          onClick={() => toggleFavorite(item)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                          style={{
                            background: savedIds.has(item.id) ? "hsl(0 70% 50%)" : "hsla(0,0%,0%,0.4)",
                            color: "white",
                          }}
                          title={savedIds.has(item.id) ? "Remove from favorites" : "Save to favorites"}
                        >
                          <Heart className="h-3.5 w-3.5" fill={savedIds.has(item.id) ? "white" : "none"} />
                        </button>
                      )}
                      <button
                        onClick={() => toggleCompare(item.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: compareIds.includes(item.id) ? "hsl(var(--primary))" : "hsla(0,0%,0%,0.4)",
                          color: compareIds.includes(item.id) ? "hsl(var(--primary-foreground))" : "white",
                        }}
                        title="Compare"
                      >
                        <GitCompareArrows className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {activeTab === "buy" && (
                      <PropertyBuyCard
                        id={item.id}
                        slug={item.slug ?? item.id}
                        title={item.title}
                        area={item.address.district || item.address.city}
                        image={getDisplayImage(item)}
                        bedrooms={item.bedrooms ?? 0}
                        bathrooms={item.bathrooms ?? 0}
                        sizeSqft={getSizeSqft(item)}
                        totalPrice={item.price}
                        pricePerSqft={item.area ? Math.round(item.price / (item.area * (item.areaUnit === "sqm" ? 10.764 : 1))) : undefined}
                        currency={item.currency}
                        isOffPlan={item.isOffPlan}
                        readyStatus={item.readyStatus}
                        brokerName={item.brokerName}
                        photoCount={item.photoCount}
                        amenities={item.amenities}
                      />
                    )}
                    {activeTab === "rent" && (
                      <PropertyRentCard
                        id={item.id}
                        slug={item.slug ?? item.id}
                        title={item.title}
                        area={item.address.district || item.address.city}
                        image={getDisplayImage(item)}
                        bedrooms={item.bedrooms ?? 0}
                        bathrooms={item.bathrooms ?? 0}
                        sizeSqft={getSizeSqft(item)}
                        annualRent={item.price * 12}
                        monthlyRent={item.price}
                        currency={item.currency}
                        furnished={item.furnishingStatus}
                        availableNow={item.status === "published"}
                        brokerName={item.brokerName}
                        photoCount={item.photoCount}
                        amenities={item.amenities}
                      />
                    )}
                    {activeTab === "projects" && (
                      <PropertyProjectCard
                        id={item.id}
                        slug={item.slug ?? item.id}
                        projectName={item.title}
                        developer={item.developer || ""}
                        area={item.address.district || item.address.city}
                        image={getDisplayImage(item)}
                        startingPrice={item.price || 0}
                        currency={item.currency}
                        completionDate={item.completionDate}
                        paymentPlan={item.paymentPlan}
                        photoCount={item.photoCount}
                      />
                    )}
                  </motion.div>
                ))}

                {listings.length === 0 && (
                  <div className="text-center py-16 col-span-full">
                    <Building2 className="h-12 w-12 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                    <p className="text-[0.875rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      No listings found
                    </p>
                    <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Try adjusting your filters or search terms
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {hasMore && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="gap-2 rounded-xl px-6"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Load more ({listings.length} of {totalCount})
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {compareIds.length >= 2 && (
        <PropertyComparePanel
          properties={listings.filter(p => compareIds.includes(p.id))}
          onClose={() => setCompareIds([])}
          onRemove={(id) => setCompareIds(prev => prev.filter(x => x !== id))}
        />
      )}

      {compareIds.length === 1 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-24 left-4 right-4 z-30 flex items-center gap-3 p-3 rounded-2xl backdrop-blur-xl shadow-lg"
          style={{ background: "hsl(var(--card) / 0.95)", border: "1px solid hsl(var(--border))" }}
        >
          <GitCompareArrows className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
          <p className="text-xs font-semibold flex-1">1 property selected — select 1 more to compare</p>
          <button onClick={() => setCompareIds([])} className="p-1">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </motion.div>
      )}
    </SubPageShell>
  );
}

function PropertyHeroVideo() {
  const theme = getVerticalTheme("property");
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <>
      {theme.heroVideo && !err && (
        <video
          src={theme.heroVideo}
          autoPlay loop muted playsInline preload="auto"
          onCanPlay={() => setLoaded(true)}
          onError={() => setErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
      {(!theme.heroVideo || !loaded || err) && (
        <img src={heroCover("property")} alt="Dubai skyline" className="absolute inset-0 w-full h-full object-cover scale-110" loading="eager" />
      )}
    </>
  );
}
