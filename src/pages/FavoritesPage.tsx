import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { listFavoriteMerchants } from "@/lib/favorites/favorites";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

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
      const { data, error } = await (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .in("id", merchantIds);

      if (error) throw error;
      return data ?? [];
    },
    enabled: merchantIds.length > 0,
    staleTime: 5000,
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Favorites</h1>
          <p className="text-xs text-muted-foreground">Saved merchants</p>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 space-y-3">
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-muted/30 h-24 animate-pulse" />
        ))}

        {!isLoading && merchants.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-foreground">No favorites yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Save your favorite restaurants and stores to access them faster.
            </p>
          </div>
        )}

        {!isLoading && merchants.length > 0 && (
          <div className="space-y-3">
            {merchants.map((merchant: any) => (
              <button
                key={merchant.id}
                onClick={() => navigate(`/food/restaurant/${merchant.id}`)}
                className="w-full rounded-2xl border border-border/20 bg-card overflow-hidden text-left active:scale-[0.99] transition-transform"
              >
                <div className="h-28 w-full bg-muted/30">
                  {merchant.cover_image ? (
                    <img src={merchant.cover_image} alt={merchant.name} className="w-full h-full object-cover" />
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
