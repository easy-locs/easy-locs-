/**
 * ShopsPage — V7 Public shop directory.
 */
import { useState, useMemo, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Store, List, Map, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { haptic } from "@/lib/haptics";

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

function InlineShopsMapView({ shops, radiusKm = 25, onOpenShop }: { shops: any[]; radiusKm?: number; onOpenShop?: (slug: string) => void }) {
  return (
    <div className="h-[520px] overflow-auto bg-muted/20 p-4">
      <div className="mb-3 text-sm font-medium text-muted-foreground">Map view — radius: {radiusKm} km</div>
      <div className="space-y-3">
        {shops?.map((shop) => (
          <button key={shop.id} onClick={() => onOpenShop?.(shop.slug)} className="w-full rounded-2xl border border-border bg-background p-4 text-left">
            <div className="font-semibold">{shop.name}</div>
            {shop.city && <div className="text-sm text-muted-foreground">{shop.city}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ShopsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tr = (k: string) => { const v = t(k); return v && v !== k ? v : FB[k] || k.split(".").pop() || ""; };

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [radius, setRadius] = useState(25);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops-browse"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, vertical, boost_tier, boost_until, created_at, lat, lng, city")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((s: any) => ({ ...s, title: s.name }));
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!shops) return [];
    let result = shops;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s: any) =>
        s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== "all") {
      result = result.filter((s: any) => s.vertical?.toLowerCase() === activeCategory);
    }
    return result;
  }, [shops, searchQuery, activeCategory]);

  const feed = (filtered || []).map((item) => ({ item, sponsored: false }));

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{tr("shops.title")}</h1>
      </div>

      {/* Search */}
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

      {/* Categories */}
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

      {/* View toggle + radius/count */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <div className="flex rounded-xl overflow-hidden border border-border/30">
          <button
            onClick={() => { setViewMode("list"); haptic("selection"); }}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" /> {tr("shops.view.list")}
          </button>
          <button
            onClick={() => { setViewMode("map"); haptic("selection"); }}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "map" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <Map className="h-3.5 w-3.5" /> {tr("shops.view.map")}
          </button>
        </div>

        {viewMode === "map" ? (
          <div className="relative ml-auto">
            <button
              onClick={() => { setShowRadiusMenu(!showRadiusMenu); haptic("light"); }}
              className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent"
            >
              {radius} km
            </button>
            {showRadiusMenu && (
              <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 min-w-[80px] bg-card border border-border shadow-lg">
                {[5, 10, 25, 50, 100].map((r) => (
                  <button key={r} onClick={() => { setRadius(r); setShowRadiusMenu(false); haptic("selection"); }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${radius === r ? "font-semibold text-primary" : "text-foreground"}`}>
                    {r} km
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="ml-auto text-[11px] text-muted-foreground font-medium">
            {filtered.length} {filtered.length === 1 ? tr("shops.results_count_one") : tr("shops.results_count_other")}
          </span>
        )}
      </div>

      {/* Content */}
      {viewMode === "map" ? (
        <div className="flex-1 min-h-[400px] relative">
          <InlineShopsMapView
            shops={feed.map((f) => f.item)}
            radiusKm={radius}
            onOpenShop={(slug) => navigate(`/s/${slug}`)}
          />
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2.5 max-w-2xl mx-auto flex-1 overflow-y-auto">
          {isLoading && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </>
          )}

          {!isLoading && feed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Store className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">{tr("shops.no_public_shops")}</p>
              <p className="text-xs text-muted-foreground mt-1">{tr("shops.no_public_shops_desc")}</p>
            </div>
          )}

          {feed.map(({ item: shop, sponsored }: any, idx: number) => (
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{shop.name}</p>
                    {sponsored && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                        {tr("shops.sponsored")}
                      </span>
                    )}
                  </div>
                  {shop.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{shop.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {shop.city && <span className="text-[10px] text-muted-foreground">{shop.city}</span>}
                    {shop.vertical && <span className="text-[10px] text-muted-foreground capitalize bg-muted/50 px-1.5 py-0.5 rounded-full">{shop.vertical}</span>}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
