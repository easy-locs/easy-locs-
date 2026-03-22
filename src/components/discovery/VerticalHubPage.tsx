/**
 * VerticalHubPage — Reusable hub page for any vertical.
 * Booking/Deliveroo/Talabat-style: hero, subcategory chips, filters, listings grouped by subcategory.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Clock, MapPin, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import FilterChip from "@/components/universe/FilterChip";
import MerchantCard from "@/components/marketplace/MerchantCard";
import { useVerticalListings, type ListingItem } from "@/hooks/useVerticalListings";
import { type VerticalDef, getSubcategoryLabel } from "@/lib/discovery/verticals";

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
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count);
    case "distance":
      return copy.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    case "newest":
      return copy.sort((a, b) => b.ranking_score - a.ranking_score);
    default:
      return copy;
  }
}

export default function VerticalHubPage({ vertical }: { vertical: VerticalDef }) {
  const [search, setSearch] = useState("");
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const navigate = useNavigate();

  const { data: listings = [], isLoading } = useVerticalListings(vertical.value, activeSub);

  const filtered = useMemo(() => {
    let items = listings;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.subcategory?.toLowerCase().includes(q)
      );
    }
    return sortItems(items, sortMode);
  }, [listings, search, sortMode]);

  // Group by subcategory for display
  const grouped = useMemo(() => {
    if (activeSub) return null; // Already filtered, show flat list
    const map = new Map<string, ListingItem[]>();
    filtered.forEach((item) => {
      const key = item.subcategory || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [filtered, activeSub]);

  const iconElement = <span className="text-xl">{vertical.emoji}</span>;

  return (
    <UniversePageShell
      title={vertical.label}
      subtitle={vertical.seoDescription.slice(0, 60)}
      icon={iconElement}
      gradient={vertical.gradient}
      seoTitle={vertical.seoTitle}
      seoDescription={vertical.seoDescription}
      search={
        <UniverseSearch
          placeholder={`Search ${vertical.label.toLowerCase()}…`}
          value={search}
          onChange={setSearch}
        />
      }
      filters={SORT_OPTIONS.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          active={sortMode === opt.value}
          onClick={() => setSortMode(opt.value)}
        />
      ))}
      loading={isLoading}
      isEmpty={filtered.length === 0 && !isLoading}
      emptyMessage={`No ${vertical.label.toLowerCase()} found`}
    >
      {/* Subcategory chips — horizontal scroll like Deliveroo/Talabat */}
      <div className="mb-5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>
          Categories
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button
            onClick={() => setActiveSub(null)}
            className="shrink-0 flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
              style={{
                background: !activeSub ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted))",
                border: !activeSub ? "2px solid hsl(var(--primary))" : "2px solid transparent",
              }}
            >
              <span className="text-lg">✨</span>
            </div>
            <span
              className="text-[10px] font-semibold leading-tight"
              style={{ color: !activeSub ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
            >
              All
            </span>
          </button>

          {vertical.subcategories.map((sub) => (
            <button
              key={sub.value}
              onClick={() => setActiveSub(activeSub === sub.value ? null : sub.value)}
              className="shrink-0 flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                style={{
                  background: activeSub === sub.value ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted))",
                  border: activeSub === sub.value ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                }}
              >
                <span className="text-2xl">{sub.icon}</span>
              </div>
              <span
                className="text-[10px] font-semibold leading-tight max-w-[56px] text-center truncate"
                style={{ color: activeSub === sub.value ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
              >
                {sub.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Listings — grouped by subcategory (like Booking sections) or flat if filtered */}
      {activeSub || !grouped ? (
        <>
          <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>
            {activeSub ? getSubcategoryLabel(vertical.value, activeSub) : "All"} · {filtered.length} results
          </h2>
          <div className="space-y-2">
            {filtered.map((item, i) => (
              <MerchantCard
                key={item.id}
                to={`/shop/${item.slug}`}
                image={item.banner_url || item.logo_url}
                name={item.name}
                category={[
                  item.subcategory ? getSubcategoryLabel(vertical.value, item.subcategory) : null,
                  item.address,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                rating={item.rating > 0 ? item.rating : undefined}
                distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                badge={item.reviews_count > 50 ? "Popular" : item.reviews_count > 20 ? "Verified" : undefined}
                index={i}
                variant="horizontal"
              />
            ))}
          </div>
        </>
      ) : (
        Array.from(grouped.entries()).map(([subKey, items]) => (
          <div key={subKey} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                {vertical.subcategories.find((s) => s.value === subKey)?.icon || "📦"}{" "}
                {getSubcategoryLabel(vertical.value, subKey)}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                  ({items.length})
                </span>
              </h2>
              <button
                onClick={() => setActiveSub(subKey)}
                className="text-[11px] font-semibold flex items-center gap-0.5"
                style={{ color: "hsl(var(--primary))" }}
              >
                See all <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Horizontal scroll for each group — like Booking/Airbnb */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {items.slice(0, 6).map((item, i) => (
                <div key={item.id} className="shrink-0 w-[200px]">
                  <MerchantCard
                    to={`/shop/${item.slug}`}
                    image={item.banner_url || item.logo_url}
                    name={item.name}
                    category={item.address || getSubcategoryLabel(vertical.value, item.subcategory || "")}
                    rating={item.rating > 0 ? item.rating : undefined}
                    distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                    index={i}
                    variant="vertical"
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </UniversePageShell>
  );
}
