import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { tc } from "@/lib/i18n-canonical";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { listFavoriteMerchants } from "@/lib/favorites/favorites";
import { storefrontService } from "@/services";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";
import { motion } from "framer-motion";
import { Heart, Star, MapPin, ChevronRight } from "lucide-react";
import { entityUrl } from "@/lib/entity/entity-url";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function FavoritesPage() {
  useUiEngine("favorites");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: favoriteRows = [], isLoading, error: favError } = useQuery({
    queryKey: ["favorite-merchants", user?.id],
    queryFn: () => listFavoriteMerchants(user?.id),
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

      const sfData = await storefrontService.fetchFavoritePages(merchantIds, (q: any) => governStorefrontQuery(q, "favorites"));

      return ((sfData ?? []) as any[])
        .sort((a: any, b: any) => (b.display_priority ?? 0) - (a.display_priority ?? 0))
        .map((r: any) => ({
          ...r,
          cover_image: r.banner_url || r.logo_url,
          review_count: r.reviews_count,
          _slug: r.slug,
        }));
    },
    enabled: merchantIds.length > 0,
    staleTime: 5000,
  });

  const subtitle = merchants.length > 0
    ? `${merchants.length} saved place${merchants.length > 1 ? "s" : ""}`
    : tc("common.saved_merchants");

  return (
    <SubPageShell title={tc("nav.favorites")} subtitle={subtitle} onBack={() => navigate("/me")} noContentPad>
      <div className="px-4 pt-3 space-y-3">
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl h-28 animate-pulse bg-muted/30" />
        ))}

        {!isLoading && favError && (
          <ErrorState message={tc("common.error")} description={tc("common.error_description")} compact />
        )}

        {!isLoading && !favError && merchants.length === 0 && (
          <EmptyState
            icon={Heart}
            title={tc("common.no_favorites")}
            description={tc("common.no_favorites_sub")}
            action={{ label: tc("common.discover_places") || "Discover Places", to: "/browse/food" }}
          />
        )}

        {!isLoading && !favError && merchants.length > 0 && (
          <div className="space-y-3">
            {merchants.map((merchant: any, idx: number) => {
              const rating = Number(merchant.rating ?? 4.2);
              return (
                <motion.button
                  key={merchant.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                  onClick={() => navigate(entityUrl({ slug: merchant._slug || merchant.slug, id: merchant.id }))}
                  className="w-full rounded-2xl bg-card overflow-hidden text-left active:scale-[0.98] transition-all group border border-border/10"
                >
                  <div className="flex gap-3 p-3">
                    <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0 relative bg-muted/30">
                      {merchant.cover_image ? (
                        <img src={merchant.cover_image} alt={merchant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5">
                        <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <p className="text-sm font-bold text-foreground line-clamp-1">{merchant.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {merchant.subcategory && (
                            <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full bg-primary/[0.06] text-primary">
                              {merchant.subcategory}
                            </span>
                          )}
                          {!merchant.subcategory && merchant.category && (
                            <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full bg-muted">
                              {merchant.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-bold text-foreground">{rating.toFixed(1)}</span>
                          </div>
                          {merchant.reviews_count > 0 && (
                            <span className="text-[0.625rem] text-muted-foreground">({merchant.reviews_count})</span>
                          )}
                          {(merchant.city || merchant.region) && (
                            <div className="flex items-center gap-0.5 text-[0.625rem] text-muted-foreground">
                              <MapPin className="w-2.5 h-2.5" />
                              {merchant.city || merchant.region}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 shrink-0" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
