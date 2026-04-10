import { heroCover, bannerCover } from "@/lib/image/category-covers";
/**
 * VerticalHubPage — Premium hub page driven by the Canonical UI Engine.
 * Every visual decision (hero, cards, motion, wording) comes from taxonomy.
 * ALL verticals use smart discovery layout with horizontal pill filters.
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ChevronRight, Home, Flame, Star, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import PremiumVerticalHero from "@/components/discovery/PremiumVerticalHero";
import PremiumMerchantCard from "@/components/discovery/PremiumMerchantCard";
import UniverseSearch from "@/components/universe/UniverseSearch";
import FilterChip from "@/components/universe/FilterChip";
import { useVerticalListings, type ListingItem } from "@/hooks/useVerticalListings";
import { type TaxonomyVertical } from "@/lib/taxonomy/world-class-taxonomy";
import { getSubcategoryLabel } from "@/lib/discovery/verticals";
import { resolveCanonicalUI, type CanonicalUISpec } from "@/lib/ui-engine";
import StoryPreviewRail from "@/components/stories/StoryPreviewRail";
import { useStoryFeed } from "@/hooks/useStoryFeed";

type SortMode = "relevance" | "rating" | "distance" | "newest";

interface QuickFilter {
  value: string | null;
  label: string;
  icon: string;
}

function buildMerchantLink(vertical: string, item: { slug: string; id: string }): string {
  const key = item.slug || item.id;
  if (vertical === "food") return `/food/restaurant/${key}`;
  return `/s/${key}`;
}

function useSortOptions() {
  const { t } = useI18n();
  return useMemo<{ value: SortMode; label: string }[]>(() => [
    { value: "relevance", label: t("discovery.sort_relevance") },
    { value: "rating", label: t("discovery.sort_top_rated") },
    { value: "distance", label: t("discovery.sort_nearest") },
    { value: "newest", label: t("discovery.sort_newest") },
  ], [t]);
}

function sortItems(items: ListingItem[], mode: SortMode): ListingItem[] {
  const copy = [...items];
  switch (mode) {
    case "rating": return copy.sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count);
    case "distance": return copy.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    case "newest": return copy.sort((a, b) => b.ranking_score - a.ranking_score);
    default: return copy;
  }
}

const CARD_VARIANTS: Record<string, object> = {
  "slide-up":   { initial: { opacity: 0, y: 12 },  animate: { opacity: 1, y: 0 } },
  "slide-left": { initial: { opacity: 0, x: -8 },  animate: { opacity: 1, x: 0 } },
  "fade":       { initial: { opacity: 0 },          animate: { opacity: 1 } },
  "scale":      { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
};

const VERTICAL_QUICK_FILTERS: Record<string, QuickFilter[]> = {
  food: [
    { value: null, label: "All", icon: "✨" },
    { value: "shawarma", label: "Shawarma", icon: "🌯" },
    { value: "burger", label: "Burgers", icon: "🍔" },
    { value: "pizza", label: "Pizza", icon: "🍕" },
    { value: "japanese", label: "Sushi", icon: "🍣" },
    { value: "indian", label: "Indian", icon: "🍛" },
    { value: "lebanese", label: "Lebanese", icon: "🧆" },
    { value: "seafood", label: "Seafood", icon: "🦐" },
    { value: "thai", label: "Thai", icon: "🍜" },
    { value: "chinese", label: "Chinese", icon: "🥟" },
    { value: "arabic", label: "Arabic", icon: "🧇" },
    { value: "korean", label: "Korean", icon: "🍱" },
  ],
  property: [
    { value: null, label: "All", icon: "✨" },
    { value: "buy_apartment", label: "Buy Apt", icon: "🔑" },
    { value: "buy_villa", label: "Buy Villa", icon: "🏠" },
    { value: "rent_apartment", label: "Rent Apt", icon: "🏢" },
    { value: "rent_villa", label: "Rent Villa", icon: "🏡" },
    { value: "rent_townhouse", label: "Townhouse", icon: "🏘️" },
    { value: "buy_penthouse", label: "Penthouse", icon: "🌆" },
    { value: "rent_office", label: "Office", icon: "💼" },
    { value: "offplan", label: "Off-Plan", icon: "🏗️" },
    { value: "investment", label: "Investment", icon: "📈" },
  ],
  stay: [
    { value: null, label: "All", icon: "✨" },
    { value: "hotel", label: "Hotel", icon: "🏨" },
    { value: "resort", label: "Resort", icon: "🏖️" },
    { value: "holiday_rental", label: "Holiday Rental", icon: "🏡" },
    { value: "serviced_apartment", label: "Serviced Apt", icon: "🏢" },
    { value: "short_stay", label: "Short Stay", icon: "🛏️" },
  ],
  grocery: [
    { value: null, label: "All", icon: "✨" },
    { value: "supermarket", label: "Supermarket", icon: "🏬" },
    { value: "fruits_vegetables", label: "Fresh", icon: "🥬" },
    { value: "butcher", label: "Butcher", icon: "🥩" },
    { value: "organic_store", label: "Organic", icon: "🌿" },
    { value: "dairy", label: "Dairy", icon: "🥛" },
    { value: "beverages_store", label: "Drinks", icon: "🥤" },
    { value: "snacks", label: "Snacks", icon: "🍿" },
    { value: "mini_mart", label: "Mini Mart", icon: "🏪" },
  ],
  shops: [
    { value: null, label: "All", icon: "✨" },
    { value: "fashion", label: "Fashion", icon: "👗" },
    { value: "electronics", label: "Electronics", icon: "📱" },
    { value: "perfume", label: "Perfume", icon: "🧴" },
    { value: "jewelry", label: "Jewelry", icon: "💍" },
    { value: "shoes", label: "Shoes", icon: "👟" },
    { value: "home_decor", label: "Home", icon: "🛋️" },
    { value: "cosmetics", label: "Beauty", icon: "💄" },
    { value: "gifts", label: "Gifts", icon: "🎁" },
    { value: "toys", label: "Toys", icon: "🧸" },
    { value: "sports_retail", label: "Sports", icon: "⚽" },
    { value: "books_stationery", label: "Books", icon: "📚" },
  ],
  services: [
    { value: null, label: "All", icon: "✨" },
    { value: "cleaning", label: "Cleaning", icon: "🧼" },
    { value: "handyman", label: "Handyman", icon: "🛠️" },
    { value: "plumbing", label: "Plumbing", icon: "🚰" },
    { value: "ac_repair", label: "AC Repair", icon: "❄️" },
    { value: "electrical", label: "Electrical", icon: "💡" },
    { value: "movers", label: "Movers", icon: "📦" },
    { value: "laundry", label: "Laundry", icon: "🧺" },
    { value: "car_repair", label: "Car Repair", icon: "🚗" },
    { value: "pest_control", label: "Pest Control", icon: "🐜" },
    { value: "tutoring", label: "Tutoring", icon: "📚" },
  ],
  healthcare: [
    { value: null, label: "All", icon: "✨" },
    { value: "pharmacy", label: "Pharmacy", icon: "💊" },
    { value: "clinic", label: "Clinic", icon: "🏥" },
    { value: "dentist", label: "Dental", icon: "🦷" },
    { value: "physio", label: "Physio", icon: "🩺" },
  ],
  experiences: [
    { value: null, label: "All", icon: "✨" },
    { value: "flights", label: "Flights", icon: "✈️" },
    { value: "activities", label: "Activities", icon: "🎯" },
    { value: "events", label: "Events", icon: "🎫" },
  ],
};

const FOOD_SECTION_ORDER = [
  { key: "_popular", label: "Popular Near You", icon: <Flame className="h-4 w-4 text-orange-500" />, subcategories: null },
  { key: "_cuisines", label: "By Cuisine", icon: <UtensilsCrossed className="h-4 w-4 text-primary" />, subcategories: ["shawarma", "lebanese", "arabic", "korean", "indian", "japanese", "thai", "chinese"] },
  { key: "_quick_bites", label: "Quick Bites", icon: <Star className="h-4 w-4 text-amber-500" />, subcategories: ["burger", "pizza", "seafood"] },
];

function getQuickFilters(vertical: TaxonomyVertical): QuickFilter[] {
  const specific = VERTICAL_QUICK_FILTERS[vertical.value];
  if (specific) return specific;
  const allFilter: QuickFilter = { value: null, label: "All", icon: "✨" };
  const fromTaxonomy: QuickFilter[] = vertical.subcategories.slice(0, 11).map(s => ({
    value: s.value,
    label: s.label,
    icon: s.icon || "📦",
  }));
  return [allFilter, ...fromTaxonomy];
}

function getSectionOrder(verticalValue: string): string[] {
  if (verticalValue === "food") {
    return FOOD_SECTION_ORDER.flatMap(s => s.subcategories ?? []);
  }
  const filters = VERTICAL_QUICK_FILTERS[verticalValue];
  if (filters) return filters.filter(f => f.value).map(f => f.value!);
  return [];
}

export default function VerticalHubPage({ vertical, storyFeedKey, storyTitle }: { vertical: TaxonomyVertical; storyFeedKey?: string; storyTitle?: string }) {
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSub = searchParams.get("sub");
  const [activeSub, setActiveSub] = useState<string | null>(initialSub);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const navigate = useNavigate();
  const { t } = useI18n();
  const SORT_OPTIONS = useSortOptions();
  const heroRailRef = useRef<HTMLDivElement | null>(null);

  const ui: CanonicalUISpec = useMemo(
    () => resolveCanonicalUI(vertical.value, activeSub),
    [vertical.value, activeSub],
  );

  const motionPreset = CARD_VARIANTS[ui.motion.cardEntry] || CARD_VARIANTS.fade;

  useEffect(() => {
    const sub = searchParams.get("sub");
    if (sub !== activeSub) setActiveSub(sub);
  }, [searchParams]);

  const handleSubSelect = (sub: string | null) => {
    setActiveSub(sub);
    if (sub) setSearchParams({ sub });
    else setSearchParams({});
  };

  const { data: listings = [], isLoading } = useVerticalListings(vertical.value, activeSub);

  const filtered = useMemo(() => {
    let items = listings;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q) ||
        l.subcategory?.toLowerCase().includes(q)
      );
    }
    return sortItems(items, sortMode);
  }, [listings, search, sortMode]);

  const grouped = useMemo(() => {
    if (activeSub) return null;
    const map = new Map<string, ListingItem[]>();
    filtered.forEach(item => {
      const key = item.subcategory || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [filtered, activeSub]);

  const popularItems = useMemo(() => {
    return [...filtered].sort((a, b) => b.reviews_count - a.reviews_count || b.rating - a.rating).slice(0, 6);
  }, [filtered]);

  const heroMediaItems = useMemo(() => {
    const source = (filtered.length > 0 ? filtered : listings).slice(0, 8);
    return source.map((item, index) => ({
      id: item.id,
      name: item.name,
      image: item.banner_url || item.logo_url || ui.heroImage,
      meta: item.subcategory ? getSubcategoryLabel(vertical.value, item.subcategory) : item.address || vertical.label,
      badge: index === 0 ? t("discovery.featured") : item.reviews_count > 25 ? t("discovery.popular") : t("discovery.new"),
      href: buildMerchantLink(vertical.value, item),
    }));
  }, [filtered, listings, ui.heroImage, vertical.label, vertical.value]);

  useEffect(() => {
    const rail = heroRailRef.current;
    if (!rail || heroMediaItems.length < 2) return;
    const interval = window.setInterval(() => {
      const maxLeft = rail.scrollWidth - rail.clientWidth;
      if (maxLeft <= 0) return;
      const nextLeft = rail.scrollLeft + 244 >= maxLeft ? 0 : rail.scrollLeft + 244;
      rail.scrollTo({ left: nextLeft, behavior: "smooth" });
    }, 3200);
    return () => window.clearInterval(interval);
  }, [heroMediaItems.length]);

  const quickFilters = useMemo(() => getQuickFilters(vertical), [vertical]);
  const sectionOrder = useMemo(() => getSectionOrder(vertical.value), [vertical.value]);
  const { data: storyItems = [] } = useStoryFeed(storyFeedKey ?? "");

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead
        title={`${ui.displayTitle} — Easy-Locs`}
        description={`Discover ${ui.displayTitle.toLowerCase()} near you on Easy-Locs.`}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSub || "base"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PremiumVerticalHero
            title={ui.displayTitle}
            tagline={isLoading ? ui.wording.loadingText : ui.wording.resultsFormat.replace("{count}", String(filtered.length))}
            emoji={ui.emoji}
            theme={{
              gradient: ui.gradient,
              accentHsl: ui.accentHsl,
              heroImage: ui.heroImage,
              heroVideo: ui.heroVideo,
              heroOverlay: ui.heroOverlay,
              tagline: ui.searchPlaceholder,
              searchPlaceholder: ui.searchPlaceholder,
              emptyEmoji: ui.emoji,
              emptyMessage: ui.wording.emptyTitle,
            }}
            search={
              <div className="rounded-xl overflow-hidden" style={{
                background: "hsl(var(--card))",
                boxShadow: "var(--shadow-elevated)",
                border: "1px solid hsl(var(--border) / 0.1)",
              }}>
                <UniverseSearch
                  placeholder={ui.searchPlaceholder}
                  value={search}
                  onChange={setSearch}
                />
              </div>
            }
          />
        </motion.div>
      </AnimatePresence>

      {storyFeedKey && storyItems.length > 0 && (
        <StoryPreviewRail title={storyTitle ?? "Trending stories"} stories={storyItems.slice(0, 8)} size="small" feedKey={storyFeedKey} surface="vertical_hub" />
      )}

      {heroMediaItems.length > 0 && (
        <section className="mt-4">
          <div
            ref={heroRailRef}
            className="flex gap-3 overflow-x-auto pb-2 pl-4 pr-4 scrollbar-none snap-x snap-mandatory"
            aria-label={`${ui.displayTitle} featured`}
          >
            {heroMediaItems.map((item, index) => (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.href)}
                className="relative shrink-0 h-[140px] w-[240px] overflow-hidden rounded-2xl snap-start text-left active:scale-[0.98] border border-border/15"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = heroCover("shops"); }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 0%, hsl(var(--background) / 0.18) 30%, hsl(var(--background) / 0.88) 100%)" }} />
                <div
                  className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-bold"
                  style={{ background: `hsl(${ui.accentHsl} / 0.18)`, color: `hsl(${ui.accentHsl})`, border: `1px solid hsl(${ui.accentHsl} / 0.24)` }}
                >
                  {item.badge}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <p className="text-sm font-bold text-white line-clamp-2 leading-tight break-words">{item.name}</p>
                  <p className="text-xs text-white/75 line-clamp-1 mt-0.5 leading-snug break-words">{item.meta}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <nav className="flex items-center gap-1.5 px-4 mt-4 mb-2 text-[11px] overflow-x-auto scrollbar-none">
        {ui.breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
            {i === 0 ? (
              <Link to={crumb.path} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="h-3 w-3" /> {crumb.label}
              </Link>
            ) : i === ui.breadcrumbs.length - 1 ? (
              <span className="font-bold" style={{ color: `hsl(${ui.accentHsl})` }}>
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => handleSubSelect(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </button>
            )}
          </span>
        ))}
      </nav>

      <SmartDiscovery
        ui={ui}
        listings={filtered}
        popularItems={popularItems}
        grouped={grouped}
        isLoading={isLoading}
        activeSub={activeSub}
        sortMode={sortMode}
        setSortMode={setSortMode}
        handleSubSelect={handleSubSelect}
        vertical={vertical}
        motionPreset={motionPreset}
        search={search}
        setSearch={setSearch}
        quickFilters={quickFilters}
        sectionOrder={sectionOrder}
      />
    </div>
  );
}

function SmartDiscovery({
  ui, listings, popularItems, grouped, isLoading, activeSub, sortMode, setSortMode,
  handleSubSelect, vertical, motionPreset, search, setSearch, quickFilters, sectionOrder,
}: {
  ui: CanonicalUISpec;
  listings: ListingItem[];
  popularItems: ListingItem[];
  grouped: Map<string, ListingItem[]> | null;
  isLoading: boolean;
  activeSub: string | null;
  sortMode: SortMode;
  setSortMode: (s: SortMode) => void;
  handleSubSelect: (sub: string | null) => void;
  vertical: TaxonomyVertical;
  motionPreset: object;
  search: string;
  setSearch: (s: string) => void;
  quickFilters: QuickFilter[];
  sectionOrder: string[];
}) {
  const SORT_OPTIONS = useSortOptions();
  const { t } = useI18n();
  return (
    <div className="mt-2">
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 snap-x snap-mandatory">
          {quickFilters.map(f => (
            <button
              key={f.value ?? "all"}
              onClick={() => handleSubSelect(f.value)}
              className="shrink-0 snap-start flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
              style={{
                background: activeSub === f.value ? `hsl(${ui.accentHsl})` : "hsl(var(--muted))",
                color: activeSub === f.value ? "white" : "hsl(var(--foreground))",
              }}
            >
              <span>{f.icon}</span> {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SORT_OPTIONS.map(opt => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={sortMode === opt.value}
              onClick={() => setSortMode(opt.value)}
            />
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="px-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 rounded-2xl p-3 animate-pulse" style={{ background: "hsl(var(--muted) / 0.5)" }}>
              <div className="w-[100px] h-[80px] rounded-xl shrink-0" style={{ background: "hsl(var(--muted))" }} />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 rounded-lg w-3/4" style={{ background: "hsl(var(--muted))" }} />
                <div className="h-3 rounded-lg w-1/2" style={{ background: "hsl(var(--muted))" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && listings.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-12 gap-4 px-4"
        >
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: `hsl(${ui.accentHsl} / 0.08)` }}>
            {ui.emoji}
          </div>
          <div className="text-center max-w-xs">
            <h3 className="text-base font-bold text-foreground mb-1">{ui.wording.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{ui.wording.emptySubtitle}</p>
          </div>
          {(activeSub || search) && (
            <div className="flex gap-2 mt-2">
              {activeSub && (
                <button onClick={() => handleSubSelect(null)} className="text-xs font-semibold px-5 py-2.5 rounded-xl" style={{ color: `hsl(${ui.accentHsl})`, background: `hsl(${ui.accentHsl} / 0.1)` }}>
                  View all
                </button>
              )}
              {search && (
                <button onClick={() => setSearch("")} className="text-xs font-semibold px-5 py-2.5 rounded-xl bg-muted text-foreground">
                  Clear search
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      <BoostSlotRenderer
        surface="vertical"
        slotKey="inline_banner_1"
        variant="inline"
        vertical={vertical.value}
        subcategory={activeSub}
        className="mb-4 px-4"
      />

      {!isLoading && activeSub && listings.length > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">
              {getSubcategoryLabel(vertical.value, activeSub)} · {listings.length} results
            </h2>
          </div>
          <div className="space-y-2.5">
            {listings.map((item, i) => (
              <motion.div
                key={item.id}
                {...motionPreset}
                transition={{ delay: i * (ui.motion.staggerMs / 1000) }}
              >
                <PremiumMerchantCard
                  to={buildMerchantLink(vertical.value, item)}
                  image={item.banner_url || item.logo_url}
                  name={item.name}
                  category={[
                    item.subcategory ? getSubcategoryLabel(vertical.value, item.subcategory) : null,
                    item.address,
                  ].filter(Boolean).join(" · ")}
                  rating={item.rating > 0 ? item.rating : undefined}
                  reviewCount={item.reviews_count}
                  distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                  badge={item.reviews_count > 50 ? t("discovery.popular") : undefined}
                  variant={i === 0 ? "featured" : "horizontal"}
                  verticalType={vertical.value}
                  index={i}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !activeSub && listings.length > 0 && (
        <>
          {popularItems.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Popular Near You
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 pl-4 pr-4 scrollbar-none snap-x snap-mandatory">
                {popularItems.map((item, i) => (
                  <div key={item.id} className="shrink-0 w-[180px] snap-start">
                    <PremiumMerchantCard
                      to={buildMerchantLink(vertical.value, item)}
                      image={item.banner_url || item.logo_url}
                      name={item.name}
                      category={item.subcategory ? getSubcategoryLabel(vertical.value, item.subcategory) : item.address || ""}
                      rating={item.rating > 0 ? item.rating : undefined}
                      reviewCount={item.reviews_count}
                      variant="vertical"
                      verticalType={vertical.value}
                      index={i}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {grouped && grouped.size > 0 && (
            Array.from(grouped.entries())
              .sort(([a], [b]) => {
                const ai = sectionOrder.indexOf(a);
                const bi = sectionOrder.indexOf(b);
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
              })
              .map(([subKey, items]) => (
                <section key={subKey} className="mb-6">
                  <div className="flex items-center justify-between px-4 mb-3">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      {vertical.subcategories.find(s => s.value === subKey)?.icon || "📦"}{" "}
                      {getSubcategoryLabel(vertical.value, subKey)}
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">({items.length})</span>
                    </h2>
                    <button
                      onClick={() => handleSubSelect(subKey)}
                      className="text-[11px] font-semibold flex items-center gap-0.5"
                      style={{ color: `hsl(${ui.accentHsl})` }}
                    >
                      See all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 pl-4 pr-4 scrollbar-none snap-x snap-mandatory">
                    {items.slice(0, 6).map((item, i) => (
                      <div key={item.id} className="shrink-0 w-[180px] snap-start">
                        <PremiumMerchantCard
                          to={buildMerchantLink(vertical.value, item)}
                          image={item.banner_url || item.logo_url}
                          name={item.name}
                          category={item.address || getSubcategoryLabel(vertical.value, item.subcategory || "")}
                          rating={item.rating > 0 ? item.rating : undefined}
                          distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                          variant="vertical"
                          verticalType={vertical.value}
                          index={i}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))
          )}
        </>
      )}

      <div className="h-24" />
    </div>
  );
}
