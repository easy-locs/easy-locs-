/**
 * ShopsPage — Public shop directory using canonical discovery pipeline.
 * Enforces visibility_mode, route_status, display_priority.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Store, List, Map, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { useDiscoverListings } from "@/hooks/useDiscoverListings";
import { useDiscoveryStore } from "@/stores/discoveryStore";

const CATEGORIES = [
  { id: "all", labelKey: "shops.category.all" },
  { id: "food", labelKey: "shops.category.food" },
  { id: "fashion", labelKey: "shops.category.fashion" },
  { id: "tech", labelKey: "shops.category.tech" },
  { id: "beauty", labelKey: "shops.category.beauty" },
  { id: "home", labelKey: "shops.category.home" },
  { id: "services", labelKey: "shops.category.services" },
];

const FB: Record<string, string> = {
  "shops.title": "Shops",
  "shops.search_placeholder": "Search shops...",
  "shops.no_public_shops": "No shops found",
  "shops.no_public_shops_desc": "Try a different search or category.",
  "shops.category.all": "All",
  "shops.category.food": "Food",
  "shops.category.fashion": "Fashion",
  "shops.category.tech": "Tech",
  "shops.category.beauty": "Beauty",
  "shops.category.home": "Home",
  "shops.category.services": "Services",
  "shops.view.list": "List",
  "shops.view.map": "Map",
  "shops.results_count_one": "shop",
  "shops.results_count_other": "shops",
  "shops.sponsored": "Sponsored",
};

export default function ShopsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tr = (k: string) => { const v = t(k); return v && v !== k ? v : FB[k] || k.split(".").pop() || ""; };

  const searchQuery = useDiscoveryStore((s) => s.searchQuery);
  const setSearchQuery = useDiscoveryStore((s) => s.setSearchQuery);
  const [activeCategory, setActiveCategory] = useState("all");

  // Canonical pipeline — visibility, route, priority enforced
  const { data: shops = [], isLoading } = useDiscoverListings("search");

  const filtered = useMemo(() => {
    let result = shops;
    if (activeCategory !== "all") {
      result = result.filter((s) => s.vertical?.toLowerCase() === activeCategory || s.subcategory?.toLowerCase()?.includes(activeCategory));
    }
    return result;
  }, [shops, activeCategory]);

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{tr("shops.title")}</h1>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr("shops.search_placeholder")}
            className="h-11 w-full rounded-2xl border border-border/40 bg-muted/40 pl-10 pr-10 text-sm outline-none ring-0 transition-all focus:border-primary/40 focus:bg-background"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-2 overflow-x-auto scrollbar-none">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); haptic("selection"); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tr(cat.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-2 flex items-center gap-2">
        <span className="ml-auto text-[11px] text-muted-foreground font-medium">
          {filtered.length} {filtered.length === 1 ? tr("shops.results_count_one") : tr("shops.results_count_other")}
        </span>
      </div>

      <div className="px-4 pb-4 space-y-2.5 max-w-2xl mx-auto flex-1 overflow-y-auto">
        {isLoading && (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Store className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">{tr("shops.no_public_shops")}</p>
            <p className="text-xs text-muted-foreground mt-1">{tr("shops.no_public_shops_desc")}</p>
          </div>
        )}

        {filtered.map((shop, idx) => (
          <motion.button
            key={shop.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            onClick={() => { haptic("light"); navigate(`/s/${shop.slug}`); }}
            className="w-full rounded-3xl border border-border/50 bg-card p-4 text-left shadow-sm transition-transform duration-150 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3.5">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-1 ring-border/20" loading="lazy" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0">
                  <Store className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{shop.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {shop.rating > 0 && <span className="text-[10px] text-amber-500 font-semibold">★ {shop.rating.toFixed(1)}</span>}
                  {shop.address && <span className="text-[10px] text-muted-foreground truncate">{shop.address}</span>}
                  {shop.vertical && <span className="text-[10px] text-muted-foreground capitalize bg-muted/50 px-1.5 py-0.5 rounded-full">{shop.vertical}</span>}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
