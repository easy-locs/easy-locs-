/**
 * FavoritesPage — Uses canonical query-governance for displaying favorites.
 * Hidden and broken-route shops are excluded via shared governance.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { tc } from "@/lib/i18n-canonical";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { listFavoriteMerchants } from "@/lib/favorites/favorites";
import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";
import { ArrowLeft } from "lucide-react";
import { entityUrl } from "@/lib/entity/entity-url";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: favoriteRows = [], isLoading } = useQuery({
    queryKey: ["favorite-merchants", user?.id],
    queryFn: () => listFavoriteMerchants(user!.id),
    enabled: !!user?.id,
    staleTime: 5000,
  });

  const merchantIds = useMemo(
    () => favoriteRows.map((row: any) => row.entity_id).filter(Boolean),
    [favoriteRows]
  );

  const { data: merchants = [] } = useQuery({
    queryKey: ["favorite-merchants-details", merchantIds],
    queryFn: async () => {
      if (!merchantIds.length) return [];

      // Storefront pages with canonical governance
      let sfQ = (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, vertical, category, subcategory, city, address, region, rating, reviews_count, banner_url, logo_url, display_priority")
        .in("id", merchantIds);
      sfQ = governStorefrontQuery(sfQ, "favorites");
      const { data: sfData } = await sfQ;

      // Single source of truth: storefront_pages only (no seed_merchants fallback)
      const sfNormalized = (sfData ?? [])
        .sort((a: any, b: any) => (b.display_priority ?? 0) - (a.display_priority ?? 0))
        .map((r: any) => ({
          ...r,
          cover_image: r.banner_url || r.logo_url,
          review_count: r.reviews_count,
          _slug: r.slug,
        }));

      return sfNormalized;
    },
    enabled: merchantIds.length > 0,
    staleTime: 5000,
  });

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{tc("nav.favorites")}</h1>
          <p className="text-xs text-muted-foreground">{tc("common.saved_merchants")}</p>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-3">
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-muted/30 h-24 animate-pulse" />
        ))}

        {!isLoading && merchants.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-foreground">{tc("common.no_favorites")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tc("common.no_favorites_sub")}
            </p>
          </div>
        )}

        {!isLoading && merchants.length > 0 && (
          <div className="space-y-3">
            {merchants.map((merchant: any) => (
              <button
                key={merchant.id}
                onClick={() => navigate(entityUrl({ slug: merchant._slug || merchant.slug, id: merchant.id }))}
                className="w-full rounded-2xl border border-border/20 bg-card overflow-hidden text-left active:scale-[0.99] transition-transform"
              >
                <div className="h-28 w-full bg-muted/30">
                  {merchant.cover_image ? (
                    <img src={merchant.cover_image} alt={merchant.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : null}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-sm font-bold text-foreground">{merchant.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {merchant.subcategory || merchant.category} · {merchant.area || merchant.city || "Dubai"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    ⭐ {Number(merchant.rating ?? 4.2).toFixed(1)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
