import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { tc } from "@/lib/i18n-canonical";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { listFavoriteMerchants } from "@/lib/favorites/favorites";
import { storefrontService } from "@/services";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Star, MapPin, ChevronRight } from "lucide-react";
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

  return (
    <div className="app-mobile-page flex flex-col bg-background pb-24">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{tc("nav.favorites")}</h1>
          <p className="text-xs text-muted-foreground">
            {merchants.length > 0 ? `${merchants.length} saved place${merchants.length > 1 ? "s" : ""}` : tc("common.saved_merchants")}
          </p>
        </div>
      </header>

      <div className="flex-1 px-4 space-y-3">
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: "hsl(var(--muted) / 0.3)" }} />
        ))}

        {!isLoading && merchants.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "hsl(350 65% 55% / 0.08)" }}>
              <Heart className="w-8 h-8" style={{ color: "hsl(350 65% 55%)" }} />
            </div>
            <p className="text-sm font-bold text-foreground">{tc("common.no_favorites")}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {tc("common.no_favorites_sub")}
            </p>
            <button
              onClick={() => navigate("/food")}
              className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform"
              style={{ background: "hsl(var(--primary))" }}
            >
              Discover Places
            </button>
          </div>
        )}

        {!isLoading && merchants.length > 0 && (
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
                  className="w-full rounded-2xl bg-card overflow-hidden text-left active:scale-[0.98] transition-all group"
                  style={{ border: "1px solid hsl(var(--border) / 0.1)" }}
                >
                  <div className="flex gap-3 p-3">
                    <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0 relative" style={{ background: "hsl(var(--muted) / 0.3)" }}>
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
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--primary) / 0.06)", color: "hsl(var(--primary))" }}>
                              {merchant.subcategory}
                            </span>
                          )}
                          {!merchant.subcategory && merchant.category && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--muted))" }}>
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
                            <span className="text-[10px] text-muted-foreground">({merchant.reviews_count})</span>
                          )}
                          {(merchant.city || merchant.region) && (
                            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
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
    </div>
  );
}
