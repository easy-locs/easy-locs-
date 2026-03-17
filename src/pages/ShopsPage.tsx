/**
 * ShopsPage — Browse all shops.
 * PASS136: Dedicated /shops route for bottom nav.
 * PASS143-144: Ranked feed with sponsored slot injection via monetization engine.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ArrowRight } from "lucide-react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SponsoredSlot } from "@/components/monetization/SponsoredSlot";
import { useRankedFeed } from "@/hooks/useRankedFeed";

export default function ShopsPage() {
  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops-browse"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, vertical, boost_tier, boost_until, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((s: any) => ({ ...s, title: s.name }));
    },
    staleTime: 60_000,
  });

  const { feed } = useRankedFeed(shops);

  return (
    <div>
      <MobilePageHeader title="Shops" />
      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {isLoading && (
          <div className="space-y-3">
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
            <Link key={shop.id} to={`/s/${shop.slug}`}>
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
            </Link>
          )
        )}
      </div>
    </div>
  );
}
