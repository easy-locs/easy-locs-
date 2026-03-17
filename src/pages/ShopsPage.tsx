/**
 * ShopsPage — V7 Public shop directory.
 * Discovery only: search, filters, categories, city/nearby, clean shop cards.
 * No management tools. No private controls.
 */
import { useState, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ArrowRight, Map, List, MapPin, ChevronDown, Search, X } from "lucide-react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SponsoredSlot } from "@/components/monetization/SponsoredSlot";
import { useRankedFeed } from "@/hooks/useRankedFeed";
import { AnimatePresence, motion } from "framer-motion";
import { haptic } from "@/lib/haptics";

const ShopsMapView = lazy(() => import("@/components/shops/ShopsMapView"));

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "food", label: "Food" },
  { id: "fashion", label: "Fashion" },
  { id: "tech", label: "Tech" },
  { id: "beauty", label: "Beauty" },
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
];

const FB: Record<string, string> = {
  "shops.title": "Shops",
  "shops.search_placeholder": "Search shops...",
  "shops.no_shops": "No shops found",
  "shops.no_shops_desc": "Try a different search or category.",
  "shops.all_shops": "All Shops",
};

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
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, vertical, boost_tier, boost_until, created_at, lat, lng, city")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((s: any) => ({ ...s, title: s.name }));
    },
    staleTime: 60_000,
  });

  // Client-side filtering
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

  const { feed } = useRankedFeed(filtered);

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <MobilePageHeader title={tr("shops.title")} />

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr("shops.search_placeholder")}
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-muted/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="px-4 pb-2 overflow-x-auto scrollbar-none">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); haptic("selection"); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* View toggle + radius */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <div className="flex rounded-xl overflow-hidden border border-border/30">
          <button onClick={() => { setViewMode("list"); haptic("selection"); }}
            className={`px-3 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button onClick={() => { setViewMode("map"); haptic("selection"); }}
            className={`px-3 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors ${viewMode === "map" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            <Map className="h-3.5 w-3.5" /> Map
          </button>
        </div>

        {viewMode === "map" && (
          <div className="relative ml-auto">
            <button onClick={() => { setShowRadiusMenu(!showRadiusMenu); haptic("light"); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
              <MapPin className="h-3 w-3" /> {radius}km <ChevronDown className="h-3 w-3" />
            </button>
            <AnimatePresence>
              {showRadiusMenu && (
                <motion.div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 min-w-[80px] bg-card border border-border shadow-lg"
                  initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                  {[5, 10, 25, 50, 100].map(r => (
                    <button key={r} onClick={() => { setRadius(r); setShowRadiusMenu(false); haptic("selection"); }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${radius === r ? "text-primary font-semibold" : "text-foreground"}`}>
                      {r} km
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {viewMode === "list" && (
          <span className="ml-auto text-[11px] text-muted-foreground font-medium">
            {filtered.length} {filtered.length === 1 ? "shop" : "shops"}
          </span>
        )}
      </div>

      {/* Map view */}
      {viewMode === "map" ? (
        <div className="flex-1 min-h-[400px] relative">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full min-h-[400px] bg-muted">
              <Store className="h-8 w-8 animate-pulse text-muted-foreground" />
            </div>
          }>
            <ShopsMapView shops={filtered || []} radiusKm={radius} onOpenShop={(slug) => navigate(`/s/${slug}`)} />
          </Suspense>
        </div>
      ) : (
        /* List view */
        <div className="px-4 pb-4 space-y-2.5 max-w-2xl mx-auto flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && feed.length === 0 && (
            <EmptyState
              icon={Store}
              title={tr("shops.no_shops")}
              description={tr("shops.no_shops_desc")}
            />
          )}

          {feed.map(({ item: shop, sponsored }, idx) =>
            sponsored ? (
              <SponsoredSlot
                key={`sp-${shop.id}`}
                id={shop.id}
                title={shop.name}
                description={shop.description}
                photoUrl={shop.logo_url}
                linkTo={`/s/${shop.slug}`}
                targetType="shop"
                shopId={shop.id}
                placement="shops_feed"
                tier={shop.boost_tier}
              />
            ) : (
              <motion.button
                key={shop.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                onClick={() => { haptic("light"); navigate(`/s/${shop.slug}`); }}
                className="w-full text-left active:scale-[0.98] transition-transform duration-150"
              >
                <Card className="hover:shadow-md transition-shadow border-border/30">
                  <CardContent className="p-3.5 flex items-center gap-3.5">
                    {shop.logo_url ? (
                      <img
                        src={shop.logo_url}
                        alt={shop.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-border/20"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{shop.name}</p>
                      {shop.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{shop.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {shop.city && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {shop.city}
                          </span>
                        )}
                        {shop.vertical && (
                          <span className="text-[10px] text-muted-foreground capitalize bg-muted/50 px-1.5 py-0.5 rounded-full">{shop.vertical}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </CardContent>
                </Card>
              </motion.button>
            )
          )}
        </div>
      )}
    </div>
  );
}
