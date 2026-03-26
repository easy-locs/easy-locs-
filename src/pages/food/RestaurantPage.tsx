/**
 * RestaurantPage — Merchant detail page.
 * Route: /food/restaurant/:restaurantId
 * Single source of truth: storefront_pages + menu_items only.
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Star, MapPin, Clock, Plus, Minus, ShoppingCart } from "lucide-react";
import FavoriteMerchantButton from "@/components/favorites/FavoriteMerchantButton";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewComposer from "@/components/reviews/ReviewComposer";
import { useAnalyticsPageView } from "@/hooks/useAnalyticsPageView";
import { trackAnalyticsEvent } from "@/lib/analytics/analyticsEngine";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

export default function RestaurantPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, itemCount, total, cart, updateQuantity } = useCart();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const { data: shop, isLoading } = useQuery({
    queryKey: ["restaurant-detail", restaurantId],
    queryFn: async () => {
      // Single source of truth: storefront_pages only
      const { data: sf } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, vertical, category, subcategory, city, address, region, rating, reviews_count, banner_url, logo_url, latitude, longitude, contact_phone, contact_whatsapp, website_url")
        .eq("id", restaurantId)
        .maybeSingle();
      if (!sf) return null;
      return {
        ...sf,
        cover_image: sf.banner_url || sf.logo_url,
        review_count: sf.reviews_count,
        delivery_time_min: null,
        delivery_time_max: null,
      };
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["restaurant-menu", restaurantId],
    queryFn: async () => {
      // Single source of truth: menu_items (published catalog)
      const { data } = await (supabase as any)
        .from("menu_items")
        .select("*")
        .eq("shop_id", restaurantId)
        .eq("available", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const grouped = (menuItems as any[]).reduce((acc: Record<string, any[]>, item: any) => {
    const key = item.category || "Menu";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  useEffect(() => {
    if (categories.length > 0 && !activeTab) setActiveTab(categories[0]);
  }, [categories.length]);

  const scrollToCategory = (cat: string) => {
    setActiveTab(cat);
    sectionRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useAnalyticsPageView({
    eventType: "merchant_view",
    userId: user?.id,
    merchantId: shop?.id,
  });

  const handleAdd = (item: any) => {
    if (!shop) return;
    addItem(
      { id: shop.id, name: shop.name, image: shop.cover_image },
      { menuItemId: item.id, name: item.name, description: item.description, imageUrl: item.image, unitPrice: Number(item.price) || 0 }
    );
    trackAnalyticsEvent({ eventType: "product_add_to_cart", userId: user?.id, merchantId: shop?.id, productId: item.id }).catch(() => {});
    toast.success(`${item.name} added`, { duration: 1500 });
  };

  const getItemQty = (menuItemId: string) => {
    if (cart.restaurantId !== shop?.id) return 0;
    return cart.items.find(i => i.menuItemId === menuItemId)?.quantity || 0;
  };

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <div className="relative w-full h-52 shrink-0" data-cover-image>
        {shop?.cover_image ? (
          <img src={shop.cover_image} alt={shop?.name || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))" }}>
            <span className="text-6xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent 50%)" }} />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform z-10" style={{ background: "hsl(0 0% 0% / 0.35)", backdropFilter: "blur(8px)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        {shop?.id && (
          <div className="absolute top-4 right-4 z-10">
            <FavoriteMerchantButton merchantId={shop.id} />
          </div>
        )}
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-2">
        <h1 className="text-xl font-black tracking-tight text-foreground">{shop?.name || "Restaurant"}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {shop?.rating != null && (
            <span className="flex items-center gap-1 text-xs font-semibold">
              <Star className="w-3.5 h-3.5" style={{ color: "hsl(45 90% 50%)", fill: "hsl(45 90% 50%)" }} />
              {Number(shop.rating).toFixed(1)}
              <span className="text-muted-foreground">({shop.review_count ?? shop.reviews_count})</span>
            </span>
          )}
          {shop?.subcategory && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>{shop.subcategory}</span>
          )}
          {(shop?.area || shop?.city) && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="w-3 h-3" />{shop.area}{shop.area && shop.city ? `, ${shop.city}` : shop.city}</span>
          )}
          {shop?.delivery_time_min != null && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" />{shop.delivery_time_min}–{shop.delivery_time_max} min</span>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="sticky top-0 z-30 mt-4" style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid hsl(var(--border) / 0.08)" }}>
          <div className="flex gap-1 overflow-x-auto px-4 py-2.5 scrollbar-hide">
            {categories.map((cat) => (
              <button key={cat} onClick={() => scrollToCategory(cat)} className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-all active:scale-95" style={{ background: activeTab === cat ? "hsl(var(--primary))" : "hsl(var(--muted))", color: activeTab === cat ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))" }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex items-center justify-center py-16">
          <motion.div className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(var(--primary))" }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
        </div>
      )}

      {!isLoading && (
        <div className="flex-1 px-4 mt-4 pb-32 space-y-6">
          {categories.length === 0 && (
            <div className="text-center py-16" data-empty-state>
              <span className="text-4xl">🍽️</span>
              <p className="text-sm text-muted-foreground mt-3 font-medium">Menu coming soon</p>
            </div>
          )}

          {categories.map((category) => (
            <section key={category} ref={(el) => { sectionRefs.current[category] = el; }} className="space-y-3 scroll-mt-16">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground capitalize">{category}</h2>
              <div className="space-y-2">
                {(grouped[category] as any[]).map((item: any) => {
                  const qty = getItemQty(item.id);
                  return (
                    <div key={item.id} data-product-row className="rounded-2xl p-3 flex gap-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--muted))" }}><span className="text-2xl">🍽️</span></div>
                      )}
                      <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
                          {item.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{item.description}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold text-foreground">{formatMoneyByCountry(Number(item.price), shop?.country, shop?.currency)}</span>
                          {qty === 0 ? (
                            <button data-add-to-cart onClick={() => handleAdd(item)} className="h-8 px-4 rounded-full flex items-center gap-1.5 active:scale-90 transition-transform text-xs font-bold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => { const ci = cart.items.find(i => i.menuItemId === item.id); if (ci) updateQuantity(ci.id, qty - 1); }} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90" style={{ background: "hsl(var(--muted))" }}><Minus className="w-3.5 h-3.5" /></button>
                              <span className="text-sm font-bold w-5 text-center">{qty}</span>
                              <button data-add-to-cart onClick={() => handleAdd(item)} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {shop?.id && (
            <div className="space-y-6 pt-4">
              <ReviewComposer merchantId={shop.id} />
              <ReviewList merchantId={shop.id} />
            </div>
          )}
        </div>
      )}

      {itemCount > 0 && cart.restaurantId === shop?.id && (
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed left-0 right-0 z-40 px-4" style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 8px)" }}>
          <button data-primary-cta onClick={() => navigate("/checkout")} className="w-full max-w-md mx-auto flex items-center justify-between px-5 py-3.5 rounded-2xl active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--primary))", boxShadow: "0 8px 32px hsl(var(--primary) / 0.35)", display: "flex" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(0 0% 100% / 0.2)" }}><ShoppingCart className="w-4 h-4 text-primary-foreground" /></div>
              <span className="text-sm font-bold text-primary-foreground">{itemCount} item{itemCount > 1 ? "s" : ""}</span>
            </div>
            <span className="text-sm font-bold text-primary-foreground">View Cart · {formatMoneyByCountry(total, shop?.country, shop?.currency)}</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
