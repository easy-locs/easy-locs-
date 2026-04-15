/**
 * SearchResultsPage — Cross-domain search results with filters.
 */
import { useEffect, useMemo } from "react";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { tc } from "@/lib/i18n-canonical";
import { ArrowLeft, Star, MapPin, Home, Briefcase, User, ShoppingBag, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import SearchFilters from "@/components/search/SearchFilters";
import { resolveCanonicalUI } from "@/lib/ui-engine";
import type { SearchResult, SearchResultType } from "@/lib/search-engine/search-types";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const TYPE_ICONS: Record<SearchResultType, React.ElementType> = {
  shop: ShoppingBag,
  product: Package,
  property: Home,
  service: Briefcase,
  profile: User,
  category: ShoppingBag,
  location: MapPin,
};

const TYPE_LABELS: Record<SearchResultType, string> = {
  shop: "Shops & Restaurants",
  product: "Products",
  property: "Properties",
  service: "Services",
  profile: "People",
  category: "Categories",
  location: "Locations",
};

export default function SearchResultsPage() {
  useUiEngine("searchresultspage");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const results = useUnifiedSearchStore((s) => s.results);
  const loading = useUnifiedSearchStore((s) => s.loading);
  const setQuery = useUnifiedSearchStore((s) => s.setQuery);
  const search = useUnifiedSearchStore((s) => s.search);
  const state = useUnifiedSearchStore((s) => s.state);

  useEffect(() => {
    if (q && q !== state.query) {
      setQuery(q);
      search();
    }
  }, [q]);

  const groupedByType = useMemo(() => {
    const map = new Map<SearchResultType, SearchResult[]>();
    results.forEach((r) => {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    });
    return Array.from(map.entries())
      .map(([type, items]) => ({ type, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [results]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "shop") {
      navigate(result.slug ? `/s/${result.slug}` : `/s/${result.id}`);
    } else if (result.type === "product" && result.shopId) {
      navigate(`/s/${result.shopId}`);
    } else if (result.type === "property") {
      navigate(`/property/detail?id=${result.id}`);
    } else if (result.type === "service") {
      navigate(`/listing/${result.id}`);
    } else if (result.type === "profile") {
      navigate(`/orbit`);
    } else if (result.type === "category") {
      navigate("/radar");
    }
  };

  return (
    <SubPageShell className="bg-background max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <UnifiedSearchBar variant="compact" className="flex-1" />
      </div>

      <div className="px-4 pb-2">
        <SearchFilters />
      </div>

      <div className="px-4 space-y-4 app-mobile-content">
        <BoostSlotRenderer surface="search" slotKey="hero_primary" variant="inline" />
        {loading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-muted/30 h-16 animate-pulse" />
        ))}

        {!loading && (
          <>
            <p className="text-xs text-muted-foreground">
              {tc("common.results", { count: results.length })} — "{q}"
            </p>

            {groupedByType.map(({ type, items }) => {
              const Icon = TYPE_ICONS[type] || ShoppingBag;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                      {TYPE_LABELS[type] || type}
                    </p>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((row, i) => (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <ResultCard row={row} onClick={() => handleResultClick(row)} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}

            {results.length === 0 && (
              <div className="text-center py-12">
                <p className="text-lg">😕</p>
                <p className="text-sm text-muted-foreground mt-2">{tc("common.no_results")}</p>
                <p className="text-xs text-muted-foreground mt-1">{tc("common.search_suggestions")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </SubPageShell>
  );
}

function ResultCard({ row, onClick }: { row: SearchResult; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-border/20 bg-card p-3 text-left active:scale-[0.99] transition-transform flex items-center gap-3"
    >
      {row.imageUrl ? (
        <img loading="lazy" src={row.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-muted shrink-0 flex items-center justify-center text-lg">
          {row.type === "property" ? "🏠" : row.type === "service" ? "🔧" : row.type === "profile" ? "👤" : "🏪"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground line-clamp-2 break-words">{row.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{row.subtitle}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {row.rating != null && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Star className="w-3 h-3 fill-current" style={{ color: "hsl(168 72% 44%)" }} />
              {row.rating.toFixed(1)}
            </span>
          )}
          {row.distanceKm != null && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {row.distanceKm.toFixed(1)} km
            </span>
          )}
          {row.isOpen != null && (
            <span className={`text-[10px] font-medium ${row.isOpen ? "text-emerald-500" : "text-muted-foreground"}`}>
              {row.isOpen ? tc("common.open") : tc("common.closed")}
            </span>
          )}
        </div>
      </div>
      {row.price != null && (
        <span className="text-xs font-bold text-primary shrink-0">
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: row.currency || "AED",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(Number(row.price))}
        </span>
      )}
    </button>
  );
}
