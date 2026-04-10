import { heroCover, bannerCover } from "@/lib/image/category-covers";
import { useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, MapPin, SlidersHorizontal, ArrowLeft,
  BedDouble, Bath, Building2, Maximize2,
  TrendingUp, Sparkles, Home, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import PropertyBuyCard from "@/components/cards/PropertyBuyCard";
import PropertyRentCard from "@/components/cards/PropertyRentCard";
import PropertyProjectCard from "@/components/cards/PropertyProjectCard";
import { FALLBACK_PROPERTIES, type FallbackProperty } from "@/data/fallback-properties";
import { tc } from "@/lib/i18n-canonical";
import StoryPreviewRail from "@/components/stories/StoryPreviewRail";
import { useStoryFeed } from "@/hooks/useStoryFeed";

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

export default function PropertyHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PropertyTab>("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("relevance");

  const listings = useMemo(() => {
    let items: FallbackProperty[];
    if (activeTab === "buy") items = FALLBACK_PROPERTIES.filter(p => p.intent === "buy");
    else if (activeTab === "rent") items = FALLBACK_PROPERTIES.filter(p => p.intent === "rent");
    else items = FALLBACK_PROPERTIES.filter(p => p.intent === "project");

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
  }, [activeTab, activeChip, searchQuery, sortBy]);

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

      <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
        <div className="absolute inset-0">
          <img
            src={heroCover("property")}
            alt="Dubai skyline"
            className="w-full h-full object-cover scale-110"
            loading="eager"
          />
        </div>
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

            <h1 className="text-[28px] font-black text-white tracking-tight leading-tight">
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
              className="shrink-0 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all whitespace-nowrap"
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="text-[12px] px-2 py-1.5 rounded-lg border"
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

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${activeChip}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-4"
          >
            {listings.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
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
                <p className="text-[12px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Try adjusting your filters or search terms
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
