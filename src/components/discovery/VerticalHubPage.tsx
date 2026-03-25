/**
 * VerticalHubPage — Premium hub page driven by the Canonical UI Engine.
 * Every visual decision (hero, cards, motion, wording) comes from taxonomy.
 */
import { useState, useMemo, useEffect } from "react";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import PremiumVerticalHero from "@/components/discovery/PremiumVerticalHero";
import PremiumMerchantCard from "@/components/discovery/PremiumMerchantCard";
import UniverseSearch from "@/components/universe/UniverseSearch";
import FilterChip from "@/components/universe/FilterChip";
import RadiusSlider from "@/components/discovery/RadiusSlider";
import CityFilter from "@/components/discovery/CityFilter";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { useVerticalListings, type ListingItem } from "@/hooks/useVerticalListings";
import { type TaxonomyVertical } from "@/lib/taxonomy/world-class-taxonomy";
import { getSubcategoryLabel } from "@/lib/discovery/verticals";
import { resolveCanonicalUI, type CanonicalUISpec } from "@/lib/ui-engine";

type SortMode = "relevance" | "rating" | "distance" | "newest";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Top Rated" },
  { value: "distance", label: "Nearest" },
  { value: "newest", label: "Newest" },
];

function sortItems(items: ListingItem[], mode: SortMode): ListingItem[] {
  const copy = [...items];
  switch (mode) {
    case "rating": return copy.sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count);
    case "distance": return copy.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    case "newest": return copy.sort((a, b) => b.ranking_score - a.ranking_score);
    default: return copy;
  }
}

/** Motion variant presets driven by canonical engine */
const CARD_VARIANTS: Record<string, object> = {
  "slide-up":   { initial: { opacity: 0, y: 12 },  animate: { opacity: 1, y: 0 } },
  "slide-left": { initial: { opacity: 0, x: -8 },  animate: { opacity: 1, x: 0 } },
  "fade":       { initial: { opacity: 0 },          animate: { opacity: 1 } },
  "scale":      { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
};

export default function VerticalHubPage({ vertical }: { vertical: TaxonomyVertical }) {
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSub = searchParams.get("sub");
  const [activeSub, setActiveSub] = useState<string | null>(initialSub);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const navigate = useNavigate();

  // ═══ CANONICAL UI ENGINE — single source of truth ═══
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

  return (
    <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))" }}>
      <SEOHead
        title={`${ui.displayTitle} — Easy-Locs`}
        description={`Discover ${ui.displayTitle.toLowerCase()} near you on Easy-Locs.`}
      />

      {/* ═══ PREMIUM HERO — driven by canonical engine ═══ */}
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
            tagline={ui.wording.resultsFormat.replace("{count}", String(filtered.length))}
            emoji={ui.emoji}
            theme={{
              gradient: ui.gradient,
              accentHsl: ui.accentHsl,
              heroImage: ui.heroImage,
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

      <div className="px-4 mt-10">
        {/* ═══ BREADCRUMBS — from canonical engine ═══ */}
        <nav className="flex items-center gap-1.5 mb-4 text-[11px] overflow-x-auto scrollbar-none">
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

        {/* ═══ SORT CHIPS ═══ */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 mb-4 snap-x snap-mandatory">
          {SORT_OPTIONS.map(opt => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={sortMode === opt.value}
              onClick={() => setSortMode(opt.value)}
            />
          ))}
        </div>

        {/* ═══ SUBCATEGORY CHIPS ═══ */}
        <div className="mb-5">
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 snap-x snap-mandatory">
            <button
              onClick={() => handleSubSelect(null)}
              className="shrink-0 snap-start flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
            >
              <div
                className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all"
                style={{
                  background: !activeSub
                    ? `hsl(${ui.accentHsl} / 0.15)`
                    : "hsl(var(--muted))",
                  border: !activeSub
                    ? `2px solid hsl(${ui.accentHsl})`
                    : "2px solid transparent",
                }}
              >
                <span className="text-lg">✨</span>
              </div>
              <span className="text-[10px] font-semibold" style={{
                color: !activeSub ? `hsl(${ui.accentHsl})` : "hsl(var(--foreground))"
              }}>All</span>
            </button>

            {vertical.subcategories.map(sub => (
              <button
                key={sub.value}
                onClick={() => handleSubSelect(activeSub === sub.value ? null : sub.value)}
                className="shrink-0 snap-start flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
              >
                <div
                  className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all"
                  style={{
                    background: activeSub === sub.value
                      ? `hsl(${ui.accentHsl} / 0.15)`
                      : "hsl(var(--muted))",
                    border: activeSub === sub.value
                      ? `2px solid hsl(${ui.accentHsl})`
                      : "2px solid transparent",
                  }}
                >
                  <span className="text-xl">{sub.icon}</span>
                </div>
                <span className="text-[10px] font-semibold max-w-[52px] text-center truncate" style={{
                  color: activeSub === sub.value ? `hsl(${ui.accentHsl})` : "hsl(var(--foreground))"
                }}>{sub.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ LOADING — vertical-specific ═══ */}
        {isLoading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-t-transparent"
              style={{ borderColor: `hsl(${ui.accentHsl})` }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-xs text-muted-foreground">{ui.wording.loadingText}</p>
          </div>
        )}

        {/* ═══ EMPTY — vertical-specific ═══ */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">{ui.emoji}</span>
            <p className="text-sm font-bold text-foreground">{ui.wording.emptyTitle}</p>
            <p className="text-xs text-muted-foreground">{ui.wording.emptySubtitle}</p>
            {activeSub && (
              <button
                onClick={() => handleSubSelect(null)}
                className="text-xs font-semibold mt-2 px-4 py-2 rounded-xl transition-all active:scale-95"
                style={{ color: `hsl(${ui.accentHsl})`, background: `hsl(${ui.accentHsl} / 0.1)` }}
              >
                ← View all {vertical.label}
              </button>
            )}
          </div>
        )}

        {/* ═══ BOOST SLOT — Vertical Hub Inline ═══ */}
        <BoostSlotRenderer
          surface="vertical"
          slotKey="inline_banner_1"
          variant="inline"
          vertical={vertical.value}
          subcategory={activeSub}
          className="mb-4"
        />

        {/* ═══ FLAT LIST — motion driven by canonical engine ═══ */}
        {!isLoading && (activeSub || !grouped) && filtered.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12px] font-bold text-foreground">
                {activeSub ? getSubcategoryLabel(vertical.value, activeSub) : "All"} · {filtered.length} results
              </h2>
            </div>
            <div className="space-y-2.5">
              {filtered.length > 0 && (
                <motion.div {...motionPreset} transition={{ delay: 0 }}>
                  <PremiumMerchantCard
                    to={filtered[0].slug ? `/s/${filtered[0].slug}` : `/s/${filtered[0].id}`}
                    image={filtered[0].banner_url || filtered[0].logo_url}
                    name={filtered[0].name}
                    category={[
                      filtered[0].subcategory ? getSubcategoryLabel(vertical.value, filtered[0].subcategory) : null,
                      filtered[0].address,
                    ].filter(Boolean).join(" · ")}
                    rating={filtered[0].rating > 0 ? filtered[0].rating : undefined}
                    reviewCount={filtered[0].reviews_count}
                    distance={filtered[0].distanceKm ? `${filtered[0].distanceKm.toFixed(1)} km` : undefined}
                    badge={filtered[0].reviews_count > 50 ? "Popular" : filtered[0].reviews_count > 20 ? "Verified" : undefined}
                    variant="featured"
                    verticalType={vertical.value}
                    index={0}
                  />
                </motion.div>
              )}
              {filtered.slice(1).map((item, i) => (
                <motion.div
                  key={item.id}
                  {...motionPreset}
                  transition={{ delay: (i + 1) * (ui.motion.staggerMs / 1000) }}
                >
                  <PremiumMerchantCard
                    to={item.slug ? `/s/${item.slug}` : `/s/${item.id}`}
                    image={item.banner_url || item.logo_url}
                    name={item.name}
                    category={[
                      item.subcategory ? getSubcategoryLabel(vertical.value, item.subcategory) : null,
                      item.address,
                    ].filter(Boolean).join(" · ")}
                    rating={item.rating > 0 ? item.rating : undefined}
                    reviewCount={item.reviews_count}
                    distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                    variant="horizontal"
                    verticalType={vertical.value}
                    index={i + 1}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* ═══ GROUPED BY SUBCATEGORY ═══ */}
        {!isLoading && !activeSub && grouped && grouped.size > 0 && (
          Array.from(grouped.entries()).map(([subKey, items]) => (
            <div key={subKey} className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
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

              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 snap-x snap-mandatory">
                {items.slice(0, 6).map((item, i) => (
                  <div key={item.id} className="shrink-0 w-[180px] snap-start">
                    <PremiumMerchantCard
                      to={item.slug ? `/s/${item.slug}` : `/s/${item.id}`}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
