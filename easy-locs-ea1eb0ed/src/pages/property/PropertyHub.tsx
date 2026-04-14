import { heroCover, bannerCover } from "@/lib/image/category-covers";
import { useState, useMemo, useCallback, useEffect } from "react";
import { getVerticalTheme } from "@/lib/discovery/vertical-themes";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, MapPin, SlidersHorizontal, ArrowLeft,
  BedDouble, Bath, Building2, Maximize2,
  TrendingUp, Sparkles, Home, ChevronRight, Map as MapIcon, List, GitCompareArrows, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import PropertyBuyCard from "@/components/cards/PropertyBuyCard";
import PropertyRentCard from "@/components/cards/PropertyRentCard";
import PropertyProjectCard from "@/components/cards/PropertyProjectCard";
import { FALLBACK_PROPERTIES, type FallbackProperty } from "@/data/fallback-properties";
import { realEstatePropertyService } from "@/services/real-estate.service";
import type { Property } from "@/domains/real-estate/canonical-types";
import { tc } from "@/lib/i18n-canonical";
import StoryPreviewRail from "@/components/stories/StoryPreviewRail";
import { useStoryFeed } from "@/hooks/useStoryFeed";
import { useUiEngine } from "@/hooks/useUiEngine";
import { PropertyMapView } from "@/components/property/PropertyMapView";
import { PropertyComparePanel } from "@/components/property/PropertyComparePanel";

type PropertyTab = "buy" | "rent" | "projects";
type SortMode = "relevance" | "price_asc" | "price_desc" | "newest" | "size";

const TABS: { key: PropertyTab; label: string; emoji: string }[] = [
  { key: "buy", label: "Buy", emoji: "🔑" },
  { key: "rent", label: "Rent", emoji: "🏢" },
  { key: "projects", label: "Projects", emoji: "🏗️" },
];

const BUY_CHIPS = [
  { value: null, label: "All" },
  { value: "buy_apartment", label: "Apartment" },
  { value: "buy_villa", label: "Villa" },
  { value: "buy_townhouse", label: "Townhouse" },
  { value: "buy_penthouse", label: "Penthouse" },
  { value: "buy_office", label: "Office" },
  { value: "buy_commercial", label: "Commercial" },
  { value: "buy_land", label: "Land" },
];

const RENT_CHIPS = [
  { value: null, label: "All" },
  { value: "rent_apartment", label: "Apartment" },
  { value: "rent_villa", label: "Villa" },
  { value: "rent_townhouse", label: "Townhouse" },
  { value: "rent_penthouse", label: "Penthouse" },
  { value: "rent_office", label: "Office" },
  { value: "rent_commercial", label: "Commercial" },
];

const PROJECT_CHIPS = [
  { value: null, label: "All" },
  { value: "offplan", label: "Off-Plan" },
  { value: "developer_project", label: "Developer" },
  { value: "investment", label: "Investment" },
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

function PropertyStorySection({ tab }: { tab: PropertyTab }) {
  const feedKey = tab === "buy" ? "property_buy" : tab === "rent" ? "property_rent" : "property_projects";
  const { data: stories = [] } = useStoryFeed(feedKey);
  const title = tab === "buy" ? "Featured for sale" : tab === "rent" ? "Popular rentals" : "Featured projects";
  if (!stories.length) return null;
  return <StoryPreviewRail title={title} stories={stories.slice(0, 8)} size="small" feedKey={feedKey} surface="property_hub" />;
}

function mapDbToFallback(p: Property, intent: "buy" | "rent" | "project"): FallbackProperty {
  const realMediaUrls = (p.mediaIds || []).filter(id => id.startsWith("http") || id.startsWith("/"));
  return {
    id: p.id,
    slug: p.id,
    title: p.title,
    vertical: "property",
    intent,
    subcategory: intent === "buy" ? `buy_${p.propertyType}` : intent === "rent" ? `rent_${p.propertyType}` : "offplan",
    area: p.address.district || p.address.city,
    city: p.address.city,
    country: p.address.country,
    image: realMediaUrls.length > 0 ? realMediaUrls[0] : bannerCover(`buy_${p.propertyType}`),
    bedrooms: p.bedrooms ?? 0,
    bathrooms: p.bathrooms ?? 0,
    sizeSqft: p.area ? Math.round(p.area * (p.areaUnit === "sqm" ? 10.764 : 1)) : 0,
    totalPrice: intent !== "rent" ? p.price : undefined,
    pricePerSqft: p.area ? Math.round(p.price / (p.area * (p.areaUnit === "sqm" ? 10.764 : 1))) : undefined,
    annualRent: intent === "rent" ? p.price * 12 : undefined,
    monthlyRent: intent === "rent" ? p.price : undefined,
    currency: p.currency,
    furnished: p.furnishingStatus as FallbackProperty["furnished"],
    availableNow: p.status === "published",
    amenities: p.amenities || [],
    latitude: p.address.geoPoint?.lat ?? 25.2,
    longitude: p.address.geoPoint?.lng ?? 55.27,
    ranking_score: p.qualityScore ?? 50,
  };
}

export default function PropertyHub() {
  useUiEngine("property-propertyhub");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PropertyTab>("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("relevance");
  const [dbProperties, setDbProperties] = useState<FallbackProperty[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadProperties() {
      try {
        const [saleProps, rentProps, shortStayProps, longStayProps, leaseProps] = await Promise.all([
          realEstatePropertyService.fetchPublished({ listingType: "sale" }),
          realEstatePropertyService.fetchPublished({ listingType: "rent" }),
          realEstatePropertyService.fetchPublished({ listingType: "short_stay" }).catch(() => [] as Property[]),
          realEstatePropertyService.fetchPublished({ listingType: "long_stay" }).catch(() => [] as Property[]),
          realEstatePropertyService.fetchPublished({ listingType: "lease" }).catch(() => [] as Property[]),
        ]);
        if (cancelled) return;
        const mapped = [
          ...saleProps.map(p => mapDbToFallback(p, "buy")),
          ...rentProps.map(p => mapDbToFallback(p, "rent")),
          ...leaseProps.map(p => mapDbToFallback(p, "rent")),
          ...shortStayProps.map(p => mapDbToFallback(p, "project")),
          ...longStayProps.map(p => mapDbToFallback(p, "project")),
        ];
        setDbProperties(mapped);
      } catch (err) {
        console.warn("[PropertyHub] DB fetch failed, using fallback", err);
      }
      if (!cancelled) setDbLoaded(true);
    }
    loadProperties();
    return () => { cancelled = true; };
  }, []);

  const allProperties = useMemo(() => {
    if (!dbLoaded || dbProperties.length === 0) return FALLBACK_PROPERTIES;
    return dbProperties;
  }, [dbProperties, dbLoaded]);

  const listings = useMemo(() => {
    let items: FallbackProperty[];
    if (activeTab === "buy") items = allProperties.filter(p => p.intent === "buy");
    else if (activeTab === "rent") items = allProperties.filter(p => p.intent === "rent");
    else items = allProperties.filter(p => p.intent === "project");

    if (activeChip) {
      items = items.filter(p => p.subcategory === activeChip);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        (p.developer?.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case "price_asc":
        items.sort((a, b) => (a.totalPrice ?? a.annualRent ?? 0) - (b.totalPrice ?? b.annualRent ?? 0));
        break;
      case "price_desc":
        items.sort((a, b) => (b.totalPrice ?? b.annualRent ?? 0) - (a.totalPrice ?? a.annualRent ?? 0));
        break;
      case "size":
        items.sort((a, b) => b.sizeSqft - a.sizeSqft);
        break;
      case "newest":
        items.sort((a, b) => b.ranking_score - a.ranking_score);
        break;
      default:
        items.sort((a, b) => b.ranking_score - a.ranking_score);
    }

    return items;
  }, [allProperties, activeTab, activeChip, searchQuery, sortBy]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
  }, []);

  const chips = getChips(activeTab);

  const handleTabChange = useCallback((tab: PropertyTab) => {
    setActiveTab(tab);
    setActiveChip(null);
    setSearchQuery("");
  }, []);

  return (
    <div className="app-mobile-page pb-28" style={{ background: "hsl(var(--background))" }}>
      <SEOHead
        title="Property — Buy, Rent & Invest | Easy-Locs"
        description="Find apartments, villas, townhouses for sale or rent. Explore off-plan projects and investment opportunities across UAE."
      />

      <div className="relative overflow-hidden" style={{ height: 320 }}>
        <PropertyHeroVideo />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, hsla(220,50%,5%,0.3) 0%, hsla(220,50%,5%,0.55) 40%, hsla(220,50%,5%,0.92) 100%)"
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

            <h1 className="text-[28px] font-bold text-white tracking-tight leading-tight">
              Property
            </h1>
            <p className="text-[13px] text-white/55 mt-1 font-medium">
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
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold transition-all"
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
            className="mt-3 relative"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/35" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getPlaceholder(activeTab)}
              className="pl-10 h-12 text-[13px] rounded-xl border-white/8 bg-white/6 text-white placeholder:text-white/28 focus:border-white/25 focus:bg-white/10 transition-all"
            />
          </motion.div>
        </div>
      </div>

      <PropertyStorySection tab={activeTab} />

      <div className="px-4 -mt-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {chips.map(chip => (
            <button
              key={chip.value ?? "all"}
              onClick={() => setActiveChip(chip.value)}
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
          <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            {listings.length} {listings.length === 1 ? "listing" : "listings"}
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
              onChange={(e) => setSortBy(e.target.value as SortMode)}
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

        {viewMode === "map" ? (
          <PropertyMapView
            properties={listings}
            onSelectProperty={(id) => {
              const prop = listings.find(p => p.id === id);
              const route = prop?.intent === "rent" ? "rent" : prop?.intent === "project" ? "sale" : "sale";
              navigate(`/real-estate/${route}/${id}`);
            }}
          />
        ) : (
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
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="relative"
                >
                  <button
                    onClick={() => toggleCompare(item.id)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: compareIds.includes(item.id) ? "hsl(var(--primary))" : "hsla(0,0%,0%,0.4)",
                      color: compareIds.includes(item.id) ? "hsl(var(--primary-foreground))" : "white",
                    }}
                    title="Compare"
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                  </button>
                  {activeTab === "buy" && (
                    <PropertyBuyCard
                      id={item.id}
                      slug={item.slug}
                      title={item.title}
                      area={item.area}
                      image={item.image}
                      bedrooms={item.bedrooms}
                      bathrooms={item.bathrooms}
                      sizeSqft={item.sizeSqft}
                      totalPrice={item.totalPrice!}
                      pricePerSqft={item.pricePerSqft}
                      currency={item.currency}
                      isOffPlan={item.isOffPlan}
                      readyStatus={item.readyStatus}
                      brokerName={item.brokerName}
                    />
                  )}
                  {activeTab === "rent" && (
                    <PropertyRentCard
                      id={item.id}
                      slug={item.slug}
                      title={item.title}
                      area={item.area}
                      image={item.image}
                      bedrooms={item.bedrooms}
                      bathrooms={item.bathrooms}
                      sizeSqft={item.sizeSqft}
                      annualRent={item.annualRent!}
                      monthlyRent={item.monthlyRent}
                      currency={item.currency}
                      furnished={item.furnished}
                      availableNow={item.availableNow}
                      brokerName={item.brokerName}
                    />
                  )}
                  {activeTab === "projects" && (
                    <PropertyProjectCard
                      id={item.id}
                      slug={item.slug}
                      projectName={item.title}
                      developer={item.developer || ""}
                      area={item.area}
                      image={item.image}
                      startingPrice={item.totalPrice || 0}
                      currency={item.currency}
                      completionDate={item.completionDate}
                      paymentPlan={item.paymentPlan}
                    />
                  )}
                </motion.div>
              ))}

              {listings.length === 0 && (
                <div className="text-center py-16">
                  <Building2 className="h-12 w-12 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                  <p className="text-[14px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                    No listings found
                  </p>
                  <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Try adjusting your filters or search terms
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {compareIds.length >= 2 && (
        <PropertyComparePanel
          properties={allProperties.filter(p => compareIds.includes(p.id))}
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
    </div>
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
