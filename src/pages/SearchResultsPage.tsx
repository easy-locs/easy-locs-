import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import UnifiedMapControls from "@/components/map/UnifiedMapControls";
import type { SearchResult } from "@/lib/search-engine/search-types";

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const results = useUnifiedSearchStore((s) => s.results);
  const loading = useUnifiedSearchStore((s) => s.loading);
  const setQuery = useUnifiedSearchStore((s) => s.setQuery);
  const search = useUnifiedSearchStore((s) => s.search);
  const state = useUnifiedSearchStore((s) => s.state);

  // Sync URL query → store on mount
  useEffect(() => {
    if (q && q !== state.query) {
      setQuery(q);
      search();
    }
  }, [q]);

  const shops = results.filter((r) => r.type === "shop");
  const products = results.filter((r) => r.type === "product");

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "shop") {
      navigate(result.slug ? `/s/${result.slug}` : `/food/restaurant/${result.id}`);
    } else if (result.type === "product" && result.shopId) {
      navigate(`/food/restaurant/${result.shopId}`);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <UnifiedSearchBar variant="compact" className="flex-1" />
      </div>

      {/* Controls */}
      <div className="px-4 pb-2">
        <UnifiedMapControls
          compact
          showHeatmap={false}
          showViewSwitch={false}
          showRadius
          showCategories
        />
      </div>

      {/* Results */}
      <div className="px-4 space-y-3 pb-20">
        {loading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-muted/30 h-16 animate-pulse" />
        ))}

        {!loading && (
          <>
            {/* Shops */}
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-1">
              Merchants ({shops.length})
            </p>

            {shops.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No merchants found
              </p>
            )}

            {shops.map((row) => (
              <button
                key={row.id}
                onClick={() => handleResultClick(row)}
                className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform flex items-center gap-3"
              >
                {row.imageUrl ? (
                  <img src={row.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{row.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{row.subtitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {row.rating != null && (
                      <span className="text-[11px] text-muted-foreground">⭐ {row.rating.toFixed(1)}</span>
                    )}
                    {row.distanceKm != null && (
                      <span className="text-[11px] text-muted-foreground">{row.distanceKm.toFixed(1)} km</span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Products */}
            {products.length > 0 && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2">
                  Products ({products.length})
                </p>
                {products.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
                    <p className="text-sm font-bold text-foreground">{row.title}</p>
                    <p className="text-[11px] text-muted-foreground">{row.subtitle}</p>
                    <p className="text-xs font-bold text-primary">{Number(row.price ?? 0).toFixed(2)} AED</p>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
