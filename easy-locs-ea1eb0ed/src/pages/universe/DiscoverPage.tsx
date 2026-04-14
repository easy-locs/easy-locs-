/**
 * DiscoverPage — Unified discovery hub with all verticals.
 * Uses canonical UI engine for vertical-aware accents and wording.
 */
import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, ChevronRight, List } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import MerchantCard from "@/components/marketplace/MerchantCard";
import { VERTICALS, getSubcategoryLabel } from "@/lib/discovery/verticals";
import { useDiscoverListings } from "@/hooks/useDiscoverListings";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { resolveCanonicalUI } from "@/lib/ui-engine";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function DiscoverPage() {
  useUiEngine("universe-discoverpage");
  const navigate = useNavigate();
  const searchQuery = useDiscoveryStore((s) => s.searchQuery);
  const setSearchQuery = useDiscoveryStore((s) => s.setSearchQuery);
  const vertical = useDiscoveryStore((s) => s.vertical);
  const setVertical = useDiscoveryStore((s) => s.setVertical);

  // Reset vertical on mount for clean browse
  useEffect(() => { setVertical(null); }, []);

  const { data: allListings = [], isLoading } = useDiscoverListings("discover");

  const filtered = useMemo(() => {
    if (!vertical) return allListings;
    return allListings.filter((l) => l.vertical === vertical);
  }, [allListings, vertical]);

  const verticalCounts = useMemo(() => {
    const map = new Map<string, number>();
    allListings.forEach((l) => {
      if (l.vertical) map.set(l.vertical, (map.get(l.vertical) || 0) + 1);
    });
    return map;
  }, [allListings]);

  return (
    <SubPageShell className="bg-muted text-foreground">
      <SEOHead
        title="Discover — Browse All Categories | Easy-Locs"
        description="Explore food, shops, services, property and more — all nearby businesses on one page."
      />

      <div className="sticky top-0 z-30 px-4 pt-3 pb-2 bg-background border-b border-border/10 bg-muted text-foreground">
        <div className="relative mb-3 bg-muted text-foreground">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 bg-muted text-foreground" style={{ color: "hsl(var(--muted-foreground))" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restaurants, shops, services…"
            className="w-full h-10 pl-10 pr-4 rounded-xl text-sm border-none outline-none bg-muted text-foreground"
           
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none bg-muted text-foreground">
          <button
            onClick={() => setVertical(null)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all bg-muted text-foreground"
            style={{
              background: !vertical ? "hsl(var(--primary))" : "hsl(var(--muted))",
              color: !vertical ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
            }}
          >
            All ({allListings.length})
          </button>
          {VERTICALS.map((v) => {
            const ui = resolveCanonicalUI(v.value);
            return (
              <button
                key={v.value}
                onClick={() => setVertical(vertical === v.value ? null : v.value)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 bg-muted text-foreground"
                style={{
                  background: vertical === v.value ? `hsl(${ui.accentHsl})` : "hsl(var(--muted))",
                  color: vertical === v.value ? "white" : "hsl(var(--foreground))",
                }}
              >
                <span>{v.emoji}</span> {v.label}
                <span className="opacity-60 bg-muted text-foreground">({verticalCounts.get(v.value) || 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 mt-6 space-y-3 bg-muted text-foreground">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse bg-muted bg-muted text-foreground" />
          ))}
        </div>
      ) : (
        <div className="px-4 mt-4 bg-muted text-foreground">
          {!vertical ? (
            VERTICALS.map((v) => {
              const items = filtered.filter((l) => l.vertical === v.value);
              if (items.length === 0) return null;
              const ui = resolveCanonicalUI(v.value);
              return (
                <div key={v.value} className="mb-6 bg-muted text-foreground">
                  <div className="flex items-center justify-between mb-2.5 bg-muted text-foreground">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 bg-muted text-foreground">
                      <span>{v.emoji}</span> {v.label}
                      <span className="text-[10px] font-normal text-muted-foreground bg-muted text-foreground">({items.length})</span>
                    </h2>
                    <button
                      onClick={() => navigate(ui.canonicalRoute)}
                      className="text-[11px] font-semibold flex items-center gap-0.5 bg-muted text-foreground"
                      style={{ color: `hsl(${ui.accentHsl})` }}
                    >
                      See all <ChevronRight className="h-3 w-3 bg-muted text-foreground" />
                    </button>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1 bg-muted text-foreground">
                    {items.slice(0, 8).map((item, i) => (
                      <div key={item.id} className="card-carousel-item bg-muted text-foreground">
                        <MerchantCard
                          to={`/s/${item.slug}`}
                          image={item.banner_url || item.logo_url}
                          name={item.name}
                          category={[
                            item.subcategory ? getSubcategoryLabel(v.value, item.subcategory) : null,
                            item.address,
                          ].filter(Boolean).join(" · ")}
                          rating={item.rating > 0 ? item.rating : undefined}
                          distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                          index={i}
                          variant="vertical"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <>
              <h2 className="text-[11px] font-bold uppercase tracking-wider mb-2 bg-muted text-foreground" style={{ color: "hsl(var(--muted-foreground))" }}>
                {filtered.length} results
              </h2>
              <div className="space-y-2 bg-muted text-foreground">
                {filtered.map((item, i) => (
                  <MerchantCard
                    key={item.id}
                    to={`/s/${item.slug}`}
                    image={item.banner_url || item.logo_url}
                    name={item.name}
                    category={[
                      item.subcategory ? getSubcategoryLabel(item.vertical || "", item.subcategory) : null,
                      item.address,
                    ].filter(Boolean).join(" · ")}
                    rating={item.rating > 0 ? item.rating : undefined}
                    distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                    index={i}
                    variant="horizontal"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </SubPageShell>
  );
}
