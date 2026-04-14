/**
 * RestaurantPage — Merchant detail page.
 * Route: /food/restaurant/:restaurantId
 * Single source of truth: storefront_pages + menu_items only.
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storefrontService } from "@/services";
import { ArrowLeft, Star, MapPin, Clock, Plus, Minus, ShoppingCart, Flame, Truck, Phone, Mail, Globe, Navigation, MessageCircle } from "lucide-react";
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
import { FALLBACK_RESTAURANTS, FALLBACK_MENUS } from "@/data/fallback-restaurants";
import SEOHead from "@/components/SEOHead";
import { buildAppUrl } from "@/lib/app-domain";
import { ChevronRight, Home } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function RestaurantPage() {
  useUiEngine("food-restaurant");
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, itemCount, total, cart, updateQuantity } = useCart();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const isUuid = !!restaurantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId);

  const { data: shop, isLoading } = useQuery({
    queryKey: ["restaurant-detail", restaurantId],
    queryFn: async () => {
      try {
        const sf = await storefrontService.fetchRestaurantDetail(restaurantId!) as any;
        if (sf) {
          return {
            ...sf,
            cover_image: sf.banner_url || sf.logo_url,
            review_count: sf.reviews_count,
            delivery_time_min: null,
            delivery_time_max: null,
            delivery_fee: null,
            minimum_order: null,
            currency: "AED",
            country: "AE",
          };
        }
      } catch (err) {
        console.warn("[RestaurantPage] Supabase query failed, using fallback", err);
      }
      const fb = FALLBACK_RESTAURANTS.find((r) => r.id === restaurantId || r.slug === restaurantId);
      if (fb) {
        return {
          ...fb,
          cover_image: fb.banner_url || fb.logo_url,
          review_count: fb.reviews_count,
        };
      }
      return null;
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["restaurant-menu", restaurantId, shop?.id],
    queryFn: async () => {
      const shopId = shop?.id || restaurantId!;
      try {
        const dbId = shop?.id || restaurantId;
        if (dbId && (isUuid || /^[0-9a-f]{8}-/i.test(dbId))) {
          const data = await storefrontService.fetchMenuItemsByShop(dbId!);
          if (data && data.length > 0) return data;
        }
      } catch (err) {
        console.warn("[RestaurantPage] menu query failed, using fallback");
      }
      if (FALLBACK_MENUS[shopId]?.length) return FALLBACK_MENUS[shopId];
      const fb = FALLBACK_RESTAURANTS.find((r) => r.slug === restaurantId || r.id === restaurantId);
      return fb ? (FALLBACK_MENUS[fb.id] || []) : [];
    },
    enabled: !!restaurantId && !!shop,
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
    try { navigator?.vibrate?.(30); } catch {}
    toast.success(`${item.name} added`, { duration: 1200, icon: "✓" });
  };

  const getItemQty = (menuItemId: string) => {
    if (cart.restaurantId !== shop?.id) return 0;
    return cart.items.find(i => i.menuItemId === menuItemId)?.quantity || 0;
  };

  const seoTitle = shop ? `${shop.name}${shop.subcategory ? ` — ${shop.subcategory}` : ""} | Easy-Locs` : "Restaurant | Easy-Locs";
  const seoDesc = shop ? `${shop.name}${shop.subcategory ? ` (${shop.subcategory})` : ""}${shop.city ? ` in ${shop.city}` : ""}. Order delivery or browse the menu on Easy-Locs.`.slice(0, 160) : "Discover restaurants on Easy-Locs.";
  const seoCanonical = restaurantId ? buildAppUrl(`/food/restaurant/${restaurantId}`) : undefined;

  const restaurantJsonLd = shop ? {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: shop.name,
    description: seoDesc,
    url: seoCanonical,
    image: shop.cover_image || shop.logo_url || undefined,
    ...(shop.subcategory ? { servesCuisine: shop.subcategory } : {}),
    ...(shop.rating != null ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(shop.rating).toFixed(1),
        reviewCount: shop.review_count ?? shop.reviews_count ?? 1,
      },
    } : {}),
    ...(shop.address || shop.city ? {
      address: {
        "@type": "PostalAddress",
        ...(shop.address ? { streetAddress: shop.address } : {}),
        ...(shop.city ? { addressLocality: shop.city } : {}),
        ...(shop.region ? { addressRegion: shop.region } : {}),
      },
    } : {}),
    ...(shop.latitude && shop.longitude ? {
      geo: { "@type": "GeoCoordinates", latitude: shop.latitude, longitude: shop.longitude },
    } : {}),
    ...(shop.contact_phone ? { telephone: shop.contact_phone } : {}),
    ...(categories?.length ? {
      hasMenu: {
        "@type": "Menu",
        hasMenuSection: categories.map((cat: string) => ({
          "@type": "MenuSection",
          name: cat,
          hasMenuItem: (menuItems || []).filter((i: any) => i.category === cat).slice(0, 5).map((i: any) => ({
            "@type": "MenuItem",
            name: i.name,
            ...(i.price ? { offers: { "@type": "Offer", price: i.price, priceCurrency: shop.currency || "AED" } } : {}),
          })),
        })),
      },
    } : {}),
  } : undefined;

  const breadcrumbJsonLd = shop ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: buildAppUrl("/") },
      { "@type": "ListItem", position: 2, name: "Food", item: buildAppUrl("/food") },
      ...(shop.subcategory ? [{ "@type": "ListItem", position: 3, name: shop.subcategory, item: buildAppUrl(`/browse/food/${shop.subcategory.toLowerCase()}`) }] : []),
      { "@type": "ListItem", position: shop.subcategory ? 4 : 3, name: shop.name },
    ],
  } : undefined;

  return (
    <SubPageShell noContentPad className="flex flex-col">
      {shop && (
        <SEOHead
          title={seoTitle}
          description={seoDesc}
          canonical={seoCanonical}
          ogImage={shop.cover_image || shop.logo_url}
          jsonLd={restaurantJsonLd && breadcrumbJsonLd ? [restaurantJsonLd, breadcrumbJsonLd] : restaurantJsonLd}
        />
      )}

      {shop && (
        <nav aria-label="Breadcrumb" className="px-4 py-2 flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          <button onClick={() => navigate("/")} className="flex items-center gap-0.5 hover:text-foreground shrink-0">
            <Home className="w-3 h-3" />
            <span>Home</span>
          </button>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <button onClick={() => navigate("/browse/food")} className="hover:text-foreground shrink-0">Food</button>
          {shop.subcategory && (
            <>
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span className="capitalize shrink-0">{shop.subcategory}</span>
            </>
          )}
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-foreground font-medium line-clamp-1 break-words">{shop.name}</span>
        </nav>
      )}

      <div className="relative w-full h-52 shrink-0" data-cover-image>
        {shop?.cover_image ? (
          <img src={shop.cover_image} alt={shop?.name || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))" }}>
            <span className="text-6xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent 50%)" }} />
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/browse/food")} className="absolute top-4 left-4 w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform z-10" style={{ background: "hsl(0 0% 0% / 0.35)", backdropFilter: "blur(8px)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        {shop?.id && (
          <div className="absolute top-4 right-4 z-10">
            <FavoriteMerchantButton merchantId={shop.id} />
          </div>
        )}
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{shop?.name || "Restaurant"}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {shop?.rating != null && (
            <span className="flex items-center gap-1 text-xs font-semibold">
              <Star className="w-3.5 h-3.5" style={{ color: "hsl(168 72% 44%)", fill: "hsl(168 72% 44%)" }} />
              {Number(shop.rating).toFixed(1)}
              <span className="text-muted-foreground">({shop.review_count ?? shop.reviews_count})</span>
            </span>
          )}
          {shop?.subcategory && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize bg-primary/10 text-primary">{shop.subcategory}</span>
          )}
          {(shop?.region || shop?.city) && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="w-3 h-3" />{shop.region}{shop.region && shop.city ? `, ${shop.city}` : shop.city}</span>
          )}
          {shop?.delivery_time_min != null && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" />{shop.delivery_time_min}–{shop.delivery_time_max} min</span>
          )}
        </div>
        {(shop?.delivery_fee != null || shop?.minimum_order != null) && (
          <div className="flex items-center gap-3 pt-1">
            {shop.delivery_fee != null && (
              <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium bg-muted">
                <Truck className="w-3 h-3 text-muted-foreground" />
                {shop.delivery_fee === 0 ? "Free delivery" : `AED ${shop.delivery_fee} delivery`}
              </span>
            )}
            {shop.minimum_order != null && shop.minimum_order > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-muted">
                Min. AED {shop.minimum_order}
              </span>
            )}
          </div>
        )}

        {(shop?.contact_phone || shop?.contact_email || shop?.contact_website || shop?.address || shop?.latitude) && (
          <div className="space-y-2 pt-2">
            <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}>
              {shop.address && (
                <div className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.06)" }}>
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-0.5">Address</p>
                    <p className="text-sm text-foreground">{shop.address}</p>
                  </div>
                </div>
              )}
              {shop.contact_phone && (
                <button onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(shop.contact_phone); toast.success("Phone number copied"); }} className="flex items-center gap-3 px-4 py-3 active:bg-primary/5 transition-colors w-full text-left" style={{ borderBottom: "1px solid hsl(var(--border) / 0.06)" }}>
                  <Phone className="w-4 h-4 shrink-0 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-0.5">Phone</p>
                    <p className="text-sm text-foreground">{shop.contact_phone}</p>
                  </div>
                </button>
              )}
              {shop.contact_email && (
                <button onClick={async () => {
                  const { navigateToOrbitThread } = await import("@/lib/orbit/navigate-to-thread");
                  const path = await navigateToOrbitThread({ targetEmail: shop.contact_email, targetUserId: shop.user_id, targetName: shop.name });
                  if (path) navigate(path);
                }} className="flex items-center gap-3 px-4 py-3 w-full text-left active:bg-primary/5 transition-colors" style={{ borderBottom: "1px solid hsl(var(--border) / 0.06)" }}>
                  <MessageCircle className="w-4 h-4 shrink-0 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-0.5">Message</p>
                    <p className="text-sm text-foreground">Send in-app message</p>
                  </div>
                </button>
              )}
              {(shop.contact_website || shop.website_url) && (
                <a href={shop.contact_website || shop.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 active:bg-primary/5 transition-colors" style={{ borderBottom: "1px solid hsl(var(--border) / 0.06)" }}>
                  <Globe className="w-4 h-4 shrink-0 text-violet-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-0.5">Website</p>
                    <p className="text-sm text-primary truncate">{(shop.contact_website || shop.website_url || "").replace(/^https?:\/\//, "")}</p>
                  </div>
                </a>
              )}
              {shop.opening_hours && (
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.06)" }}>
                  <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-0.5">Hours</p>
                    <p className="text-sm text-foreground">{shop.opening_hours}</p>
                  </div>
                </div>
              )}
              {shop.latitude != null && shop.longitude != null && (
                <a href={`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 active:bg-primary/5 transition-colors">
                  <Navigation className="w-4 h-4 shrink-0 text-rose-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-0.5">GPS</p>
                    <p className="text-sm text-foreground">{Number(shop.latitude).toFixed(4)}°N, {Number(shop.longitude).toFixed(4)}°E</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}
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
        <div className="flex-1 px-4 mt-4 pb-[var(--page-bottom-pad)] space-y-6">
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
                        <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 bg-muted"><span className="text-2xl">🍽️</span></div>
                      )}
                      <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground line-clamp-2 break-words">{item.name}</h3>
                          {item.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{item.description}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{formatMoneyByCountry(Number(item.price), shop?.country, shop?.currency)}</span>
                            {item.calories > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Flame className="w-2.5 h-2.5" />{item.calories} kcal</span>
                            )}
                          </div>
                          {qty === 0 ? (
                            <motion.button
                              data-add-to-cart
                              onClick={() => handleAdd(item)}
                              whileTap={{ scale: 0.85 }}
                              className="h-9 px-5 rounded-full flex items-center gap-1.5 transition-colors text-xs font-bold shadow-sm"
                              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                            >
                              <Plus className="w-3.5 h-3.5" /> Add
                            </motion.button>
                          ) : (
                            <motion.div
                              initial={{ scale: 0.9 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 rounded-full px-1 bg-muted/50"
                            >
                              <button onClick={() => { const ci = cart.items.find(i => i.menuItemId === item.id); if (ci) updateQuantity(ci.id, qty - 1); }} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform bg-muted"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="text-sm font-bold w-6 text-center tabular-nums">{qty}</span>
                              <button data-add-to-cart onClick={() => handleAdd(item)} className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}><Plus className="w-3.5 h-3.5" /></button>
                            </motion.div>
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
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed left-0 right-0 z-40 px-4"
          style={{ bottom: "calc(var(--mobile-bottom-nav-h, 72px) + env(safe-area-inset-bottom, 0px) + 8px)" }}
        >
          <button
            data-primary-cta
            onClick={() => navigate("/checkout")}
            className="w-full max-w-md mx-auto flex items-center justify-between px-5 py-4 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, hsl(225 22% 16%), hsl(225 22% 20%))", boxShadow: "0 8px 32px hsl(225 22% 16% / 0.5), 0 0 0 1px hsl(var(--accent) / 0.15)" }}
          >
            <div className="flex items-center gap-2.5">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "hsl(var(--accent) / 0.2)" }}
              >
                <ShoppingCart className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
              </motion.div>
              <div className="text-left">
                <span className="text-sm font-bold text-white">{itemCount} item{itemCount > 1 ? "s" : ""}</span>
                <p className="text-[10px] text-white/50">Tap to checkout</p>
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: "hsl(var(--accent))" }}>{formatMoneyByCountry(total, shop?.country, shop?.currency)} →</span>
          </button>
        </motion.div>
      )}
    </SubPageShell>
  );
}
