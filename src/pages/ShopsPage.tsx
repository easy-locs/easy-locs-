/**
 * ShopsPage — Browse all shops with list + map views.
 * PASS136: Dedicated /shops route for bottom nav.
 * PASS151: Full card clickability, map view with radius, smooth mobile UX.
 */
import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ArrowRight, Map, List, MapPin, ChevronDown } from "lucide-react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SponsoredSlot } from "@/components/monetization/SponsoredSlot";
import { useRankedFeed } from "@/hooks/useRankedFeed";
import { AnimatePresence, motion } from "framer-motion";
import { haptic } from "@/lib/haptics";

const ShopsMapView = lazy(() => import("@/components/shops/ShopsMapView"));

export default function ShopsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [radius, setRadius] = useState(25);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);

  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops-browse"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, vertical, boost_tier, boost_until, created_at, lat, lng")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((s: any) => ({ ...s, title: s.name }));
    },
    staleTime: 60_000,
  });

  const { feed } = useRankedFeed(shops);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <MobilePageHeader title="Shops" />

      {/* View toggle + radius */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-border/30">
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
      </div>

      {/* Map view */}
      {viewMode === "map" ? (
        <div className="flex-1 min-h-[400px] relative">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full min-h-[400px] bg-muted">
              <Store className="h-8 w-8 animate-pulse text-muted-foreground" />
            </div>
          }>
            <ShopsMapView shops={shops || []} radius={radius} onShopClick={(slug) => navigate(`/s/${slug}`)} />
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
              title="No shops yet"
              description="Shops will appear here once merchants publish their storefronts."
            />
          )}

          {feed.map(({ item: shop, sponsored }) =>
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
              <button
                key={shop.id}
                onClick={() => { haptic("light"); navigate(`/s/${shop.slug}`); }}
                className="w-full text-left active:scale-[0.98] transition-all duration-150"
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    {shop.logo_url ? (
                      <img
                        src={shop.logo_url}
                        alt={shop.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{shop.name}</p>
                      {shop.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{shop.description}</p>
                      )}
                      {shop.vertical && (
                        <span className="text-[10px] text-muted-foreground capitalize">{shop.vertical}</span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
