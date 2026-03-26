/**
 * SearchResultsPage — Canonical search results, driven by UI engine per vertical.
 */
import { useEffect, useMemo } from "react";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { tc } from "@/lib/i18n-canonical";
import { ArrowLeft, Star, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import UnifiedMapControls from "@/components/map/UnifiedMapControls";
import { resolveCanonicalUI } from "@/lib/ui-engine";
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

  useEffect(() => {
    if (q && q !== state.query) {
      setQuery(q);
      search();
    }
  }, [q]);

  const shops = results.filter((r) => r.type === "shop");
  const products = results.filter((r) => r.type === "product");

  // Group shops by vertical using canonical engine
  const groupedByVertical = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    shops.forEach((s) => {
      const v = s.vertical || "other";
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(s);
    });
    return Array.from(map.entries())
      .map(([vertical, items]) => ({
        vertical,
        items,
        ui: resolveCanonicalUI(vertical),
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [shops]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "shop") {
      navigate(result.slug ? `/s/${result.slug}` : `/s/${result.id}`);
    } else if (result.type === "product" && result.shopId) {
      navigate(`/s/${result.shopId}`);
    } else if (result.type === "category") {
      navigate("/radar");
    }
  };

  return (
    <div className="app-mobile-page bg-background max-w-lg mx-auto">
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
        <UnifiedMapControls compact showHeatmap={false} showViewSwitch={false} showRadius showCategories />
      </div>

      {/* Results */}
      <div className="px-4 space-y-4 app-mobile-content">
        {/* ═══ BOOST SLOT — Search Top ═══ */}
        <BoostSlotRenderer surface="search" slotKey="hero_primary" variant="inline" />
        {loading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-muted/30 h-16 animate-pulse" />
        ))}

        {!loading && (
          <>
            <p className="text-xs text-muted-foreground">
              {tc("common.results", { count: shops.length + products.length })} — "{q}"
            </p>

            {/* Vertical-grouped results — each section styled by canonical engine */}
            {groupedByVertical.map(({ vertical, items, ui }) => (
              <VerticalResultSection
                key={vertical}
                ui={ui}
                items={items}
                onClick={handleResultClick}
              />
            ))}

            {/* Products */}
            {products.length > 0 && (
              <ResultSection title="📦 Products" count={products.length}>
                {products.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => handleResultClick(row)}
                    className="w-full rounded-2xl border border-border/20 bg-card p-3 text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
                  >
                    {row.imageUrl ? (
                      <img src={row.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{row.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{row.subtitle}</p>
                    </div>
                    <span className="text-xs font-bold text-primary shrink-0">
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: row.currency || "AED", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(row.price ?? 0))}
                    </span>
                  </button>
                ))}
              </ResultSection>
            )}

            {/* Empty */}
            {shops.length === 0 && products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-lg">😕</p>
                <p className="text-sm text-muted-foreground mt-2">{tc("common.no_results")}</p>
                <p className="text-xs text-muted-foreground mt-1">{tc("common.search_suggestions")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Vertical-aware result section with accent from canonical engine */
function VerticalResultSection({
  ui,
  items,
  onClick,
}: {
  ui: ReturnType<typeof resolveCanonicalUI>;
  items: SearchResult[];
  onClick: (r: SearchResult) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: `hsl(${ui.accentHsl})` }} />
          {ui.emoji} {ui.displayTitle}
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
            <ShopCard row={row} onClick={() => onClick(row)} accentHsl={ui.accentHsl} ctaLabel={ui.button.primaryCta} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ResultSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-foreground uppercase tracking-wide">{title}</p>
        <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ShopCard({
  row,
  onClick,
  accentHsl,
  ctaLabel,
}: {
  row: SearchResult;
  onClick: () => void;
  accentHsl?: string;
  ctaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-border/20 bg-card p-3 text-left active:scale-[0.99] transition-transform flex items-center gap-3"
    >
      {row.imageUrl ? (
        <img src={row.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-muted shrink-0 flex items-center justify-center text-lg">🏪</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{row.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{row.subtitle}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {row.rating != null && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Star className="w-3 h-3 fill-current" style={{ color: "hsl(45 90% 50%)" }} />
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
      {ctaLabel && accentHsl && (
        <span
          className="text-[9px] font-bold px-2 py-1 rounded-lg shrink-0"
          style={{ background: `hsl(${accentHsl} / 0.1)`, color: `hsl(${accentHsl})` }}
        >
          {ctaLabel}
        </span>
      )}
    </button>
  );
}
