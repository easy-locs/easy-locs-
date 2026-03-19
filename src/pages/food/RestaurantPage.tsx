/**
 * RestaurantPage — Dedicated restaurant detail + grouped menu (no prices shown).
 * Add-to-cart enabled. Prices stored internally for checkout.
 * Route: /food/restaurant/:restaurantId
 */
import { useParams, useNavigate } from "react-router-dom";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Star, MapPin, Clock, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import CartSheet from "@/components/cart/CartSheet";

export default function RestaurantPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { addItem, itemCount } = useCart();
  useDinoPageAudit({ actorType: "anonymous", pageKey: "restaurant_page" });

  const { data: shop, isLoading } = useQuery({
    queryKey: ["restaurant-detail", restaurantId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, city, vertical, subcategory, description, logo_url, cover_url, latitude, longitude, rating, merchant_profile_id")
        .or(`slug.eq.${restaurantId},id.eq.${restaurantId}`)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["restaurant-menu", shop?.id],
    queryFn: async () => {
      if (!shop?.id) return [];
      const merchantId = shop.merchant_profile_id || shop.id;
      const { data } = await (supabase as any)
        .from("menu_items")
        .select("id, name, description, image_url, category_name, menu_category, is_available, sort_order, price")
        .or(`merchant_profile_id.eq.${merchantId},shop_id.eq.${shop.id}`)
        .eq("is_available", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!shop?.id,
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
  });

  const grouped = (menuItems as any[]).reduce((acc: Record<string, any[]>, item: any) => {
    const key = item.category_name || item.menu_category || "Menu";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const categoryKeys = Object.keys(grouped);
  const coverImage = shop?.cover_url || shop?.logo_url;

  const handleAdd = (item: any) => {
    if (!shop) return;
    addItem(
      { id: shop.id, name: shop.name, image: shop.logo_url },
      { menuItemId: item.id, name: item.name, description: item.description, imageUrl: item.image_url, unitPrice: Number(item.price) || 0 }
    );
    toast.success(`${item.name} added`);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      {/* Cover */}
      <div className="relative w-full h-48 shrink-0" style={{ background: "hsl(var(--muted))" }}>
        {coverImage ? (
          <img src={coverImage} alt={shop?.name || ""} className="w-full h-full object-cover" loading="eager" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))" }}>
            <span className="text-5xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent 60%)" }} />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl active:scale-90 transition-transform z-10"
          style={{ background: "hsl(0 0% 0% / 0.4)" }}
          aria-label="Go back"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-white" />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 -mt-6 relative z-10">
        <h1 className="text-xl font-black tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
          {shop?.name || "Restaurant"}
        </h1>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {shop?.rating != null && (
            <span className="flex items-center gap-1 text-xs font-medium">
              <Star className="w-3.5 h-3.5" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} />
              {Number(shop.rating).toFixed(1)}
            </span>
          )}
          {(shop?.subcategory || shop?.vertical) && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
              {shop.subcategory || shop.vertical}
            </span>
          )}
          {shop?.city && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />{shop.city}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />20–35 min
          </span>
        </div>
        {shop?.description && (
          <p className="text-sm mt-2 leading-relaxed text-muted-foreground line-clamp-3">{shop.description}</p>
        )}
      </div>

      {/* Category tabs */}
      {categoryKeys.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 mt-4 pb-1 scrollbar-hide">
          {categoryKeys.map((cat) => (
            <a
              key={cat}
              href={`#cat-${cat.replace(/\s+/g, "-")}`}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap active:scale-95 transition-transform"
              style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
            >
              {cat}
            </a>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center py-16">
          <motion.div
            className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}

      {/* Menu */}
      {!isLoading && (
        <div className="flex-1 px-4 mt-5 pb-32 space-y-6">
          {categoryKeys.length === 0 && (
            <div className="text-center py-12">
              <span className="text-3xl">🍽️</span>
              <p className="text-sm text-muted-foreground mt-2 font-medium">Menu coming soon</p>
            </div>
          )}

          {categoryKeys.map((category) => (
            <section key={category} id={`cat-${category.replace(/\s+/g, "-")}`} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "hsl(var(--foreground))" }}>
                {category}
              </h2>
              <div className="space-y-2">
                {(grouped[category] as any[]).map((item: any) => (
                  <div
                    key={item.id}
                    className="rounded-2xl p-3 flex gap-3 active:scale-[0.98] transition-transform"
                    style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.2)" }}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-xl object-cover shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--muted))" }}>
                        <span className="text-2xl">🍽️</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{item.name}</h3>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAdd(item)}
                        className="self-end mt-1 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                        style={{ background: "hsl(var(--primary))" }}
                        aria-label={`Add ${item.name}`}
                      >
                        <Plus className="w-4 h-4" style={{ color: "hsl(var(--primary-foreground))" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Cart sheet */}
      <CartSheet />
    </div>
  );
}
