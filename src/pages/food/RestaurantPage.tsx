/**
 * RestaurantPage — Step 4: Restaurant detail + menu
 * Route: /food/restaurant/:restaurantId
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UniversePageShell from "@/components/universe/UniversePageShell";
import { Star, MapPin, Clock } from "lucide-react";

export default function RestaurantPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  const { data: shop, isLoading } = useQuery({
    queryKey: ["restaurant-detail", restaurantId],
    queryFn: async () => {
      // Try slug first, then id
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("*")
        .or(`slug.eq.${restaurantId},id.eq.${restaurantId}`)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["restaurant-menu", shop?.id],
    queryFn: async () => {
      if (!shop?.merchant_profile_id) return [];
      const { data } = await (supabase as any)
        .from("menu_items")
        .select("*")
        .eq("merchant_profile_id", shop.merchant_profile_id)
        .eq("is_available", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!shop?.merchant_profile_id,
  });

  return (
    <UniversePageShell
      title={shop?.name || "Restaurant"}
      subtitle={shop?.city || ""}
      loading={isLoading}
      isEmpty={!shop && !isLoading}
      emptyMessage="Restaurant not found"
    >
      {shop && (
        <div className="space-y-4">
          {/* Info bar */}
          <div className="flex items-center gap-4 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} /> 4.5</span>
            {shop.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {shop.city}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 20-35 min</span>
          </div>

          {shop.description && (
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{shop.description}</p>
          )}

          {/* Menu */}
          <h2 className="text-xs font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Menu</h2>
          {menuItems.length === 0 && (
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>Menu coming soon</p>
          )}
          <div className="space-y-2">
            {menuItems.map((item: any) => (
              <button
                key={item.id}
                className="w-full rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.3)" }}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
                ) : (
                  <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--muted))" }}>
                    <span className="text-xl">🍽️</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  {item.description && <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{item.description}</p>}
                </div>
                {item.price != null && (
                  <span className="text-sm font-bold shrink-0" style={{ color: "hsl(var(--primary))" }}>
                    {item.price.toFixed(2)} {item.currency || ""}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </UniversePageShell>
  );
}
