/**
 * ShopPage V2 — Premium conversion-first storefront.
 * Route: /s/{slug}
 * Design: Apple/Stripe-inspired, clean, smart, futuristic.
 */
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { resolveCoverImage, resolveLogoImage } from "@/lib/image/dual-layer-image";
import { getRequiredAttribution } from "@/lib/image/source-policy";
import { useCanonicalUI } from "@/hooks/useCanonicalUI";
import { buildAppUrl } from "@/lib/app-domain";
import ShareButtons from "@/components/public/ShareButtons";
import { useStorefrontCart } from "@/hooks/useStorefrontCart";
import { useStorefrontCoupon } from "@/hooks/useStorefrontCoupon";
import { useStorefrontCurrency } from "@/hooks/useStorefrontCurrency";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Loader2, MapPin, ShoppingCart, Plus, Minus, Trash2, Phone,
  MessageCircle, Send, CheckCircle2, Store, Tag, X, Globe,
  Star, Clock, ChevronRight, ArrowLeft,
} from "lucide-react";
import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { toast } from "sonner";
import { useStorefrontAnalytics } from "@/hooks/useStorefrontAnalytics";
import { useShopTranslation } from "@/hooks/useShopTranslation";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getTopBanners } from "@/lib/context-banner/context-banner-engine";

// Only essential lazy sections
const ShopReviews = lazy(() => import("@/components/storefront/ShopReviews"));
const AdvancedCheckout = lazy(() => import("@/components/storefront/AdvancedCheckout"));

type ShopTab = "overview" | "menu" | "reviews" | "info";

export default function ShopPage() {
  const { slug: shopSlug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get("invite");
  const actionParam = searchParams.get("action");
  const { user } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [activeTab, setActiveTab] = useState<ShopTab>(actionParam === "review" ? "reviews" : "overview");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isUuid = !!shopSlug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopSlug);

  // ── Shop data ──
  const { data: shop, isLoading } = useQuery({
    queryKey: ["storefront-page", shopSlug],
    queryFn: async () => {
      let query = (supabase as any).from("storefront_pages").select("*");
      if (isUuid) query = query.eq("id", shopSlug!);
      else query = query.eq("slug", shopSlug!);
      const { data } = await query.maybeSingle();
      if (data) return data;

      // Fallback: seed_merchants
      const seedQuery = (supabase as any).from("seed_merchants").select("*");
      if (isUuid) seedQuery.eq("id", shopSlug!);
      else {
        const nameGuess = shopSlug!.replace(/-/g, " ");
        seedQuery.ilike("name", `%${nameGuess}%`);
      }
      const { data: seedResults } = await seedQuery.limit(1).maybeSingle();
      const seed = seedResults || (isUuid ? null : await (async () => {
        const { data } = await (supabase as any).from("seed_merchants").select("*").eq("id", shopSlug!).maybeSingle();
        return data;
      })());

      if (seed) return {
        ...seed, slug: seed.id, vertical: seed.category,
        banner_url: seed.cover_image, logo_url: seed.logo_image,
        address: seed.area, visibility_mode: seed.visibility_mode || "coming_soon", _isSeed: true,
      };
      return null;
    },
    enabled: !!shopSlug,
  });

  // ── Catalog ──
  const { data: catalogItems = [] } = useQuery({
    queryKey: ["storefront-catalog", shop?.id, shop?._isSeed],
    queryFn: async () => {
      if (!shop) return [];
      if (shop._isSeed) {
        const { data } = await (supabase as any).from("seed_products").select("*")
          .eq("merchant_id", shop.id).eq("is_available", true).order("sort_order");
        return (data || []).map((p: any) => ({
          id: p.id, name: p.name, description: p.description, price: p.price,
          image_url: p.image, category_id: p.category, category_name: p.category,
          available: p.is_available, sort_order: p.sort_order,
        }));
      }
      const { data } = await (supabase as any).from("catalog_items")
        .select("*, storefront_catalog_categories(name)")
        .eq("shop_id", shop.id).eq("available", true).order("sort_order");
      return data || [];
    },
    enabled: !!shop?.id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["storefront-categories", shop?.id],
    queryFn: async () => {
      if (!shop) return [];
      const { data } = await (supabase as any).from("storefront_catalog_categories").select("*")
        .eq("shop_id", shop.id).eq("active", true).order("sort_order");
      return data || [];
    },
    enabled: !!shop?.id,
  });

  const cart = useStorefrontCart(shop?.id);
  const coupon = useStorefrontCoupon(shop?.id);
  const analytics = useStorefrontAnalytics(shop?.id);
  const shopT = useShopTranslation(shop?.id);
  const fx = useStorefrontCurrency(shop?.currency || shop?.default_currency || "AED");
  const verticalUI = useCanonicalUI(shop?.vertical, shop?.subcategory);

  const filteredItems = activeCategory
    ? catalogItems.filter((i: any) => i.category_id === activeCategory)
    : catalogItems;

  const discount = coupon.appliedCoupon?.discountAmount || 0;
  const finalTotal = Math.max(0, cart.total - discount);

  useEffect(() => { if (shop?.id) analytics.trackPageView(); }, [shop?.id]);

  const handleCheckout = () => {
    if (!user) { toast.error("Please sign in to checkout"); return; }
    if (cart.items.length === 0) return;
    analytics.trackCheckout(finalTotal, shop.currency);
    setCheckoutMode(true);
    setCartOpen(false);
  };

  const handleCheckoutComplete = async (orderId: string) => {
    analytics.trackPurchase(orderId, finalTotal, shop.currency);
    if (coupon.appliedCoupon) { await coupon.recordUsage(orderId); coupon.removeCoupon(); }
    await cart.clearCart();
    setCheckoutMode(false);
    toast.success("Order placed! The seller will confirm soon.");
  };

  // ── Loading & Error states ──
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!shop) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Store className="h-12 w-12 text-muted-foreground/50" />
      <p className="text-muted-foreground font-medium">Shop not found</p>
      <p className="text-xs text-muted-foreground">"{shopSlug}" doesn't exist or has been removed.</p>
      <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Go back</Button>
    </div>
  );

  if (shop.shop_visibility === "private" && !inviteToken && shop.user_id !== user?.id) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Store className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">This shop is private.</p>
      </div>
    );
  }

  const coverImage = resolveCoverImage(shop);
  const logoImage = resolveLogoImage(shop);
  const attribution = getRequiredAttribution(shop.source_type);

  // Context banners for this shop
  const contextBanners = getTopBanners({
    country: shop.country, city: shop.city,
  }, 1);

  const TABS: { id: ShopTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "menu", label: `Menu${catalogItems.length > 0 ? ` (${catalogItems.length})` : ""}` },
    { id: "reviews", label: "Reviews" },
    { id: "info", label: "Info" },
  ];

  return (
    <>
      <SEOHead
        title={`${shop.name} | ${verticalUI.displayTitle}`}
        description={shop.description || `Browse ${shop.name}'s catalog`}
        ogImage={coverImage.url}
        canonical={buildAppUrl(`/s/${shop.slug}`)}
      />

      <div className="min-h-screen bg-background pb-24">
        {/* ═══ HERO ═══ */}
        <div className="relative">
          {/* Cover image */}
          <div className="h-52 sm:h-64 bg-muted overflow-hidden relative">
            <img src={coverImage.url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            {attribution && (
              <span className="absolute bottom-1 right-2 text-[9px] text-white/50 bg-black/20 px-1.5 py-0.5 rounded">
                {attribution}
              </span>
            )}
          </div>

          {/* Back button floating */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 z-20 h-9 w-9 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
          </button>

          {/* Share floating */}
          <div className="absolute top-3 right-3 z-20">
            <ShareButtons type="host" slug={shop.slug} title={shop.name} />
          </div>

          {/* Shop identity — overlapping hero */}
          <div className="relative z-10 -mt-14 px-4 max-w-2xl mx-auto">
            <div className="flex items-end gap-3.5">
              {logoImage ? (
                <img
                  src={logoImage.url}
                  alt={shop.name}
                  className="w-[72px] h-[72px] rounded-2xl border-[3px] border-background object-cover shadow-lg bg-card"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-2xl border-[3px] border-background bg-card flex items-center justify-center shadow-lg">
                  <Store className="h-7 w-7 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0 pb-0.5">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-bold text-foreground truncate leading-tight">
                    {shopT.t("name", shop.name)}
                  </h1>
                  {shop.is_verified && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {shop.rating != null && Number(shop.rating) > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                      <Star className="h-3 w-3 fill-amber-500" />
                      {Number(shop.rating).toFixed(1)}
                    </span>
                  )}
                  {shop.city && (
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {shop.city}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                    {shop.vertical || "Shop"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CTA ROW ═══ */}
        <div className="px-4 max-w-2xl mx-auto mt-4">
          <div className="flex gap-2">
            {catalogItems.length > 0 && (
              <Button
                size="sm"
                className="flex-1 gap-1.5 font-semibold h-10 rounded-xl"
                onClick={() => { setActiveTab("menu"); menuRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                View Menu
              </Button>
            )}
            {shop.contact_phone && (
              <Button size="sm" variant="outline" className="gap-1.5 h-10 rounded-xl" asChild>
                <a href={`tel:${shop.contact_phone}`}><Phone className="h-3.5 w-3.5" /></a>
              </Button>
            )}
            {shop.contact_whatsapp && (
              <Button size="sm" variant="outline" className="gap-1.5 h-10 rounded-xl text-[#25D366] border-[#25D366]/30" asChild>
                <a href={`https://wa.me/${shop.contact_whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {shop.contact_email && (
              <Button size="sm" variant="outline" className="gap-1.5 h-10 rounded-xl" asChild>
                <a href={`mailto:${shop.contact_email}`}><Send className="h-3.5 w-3.5" /></a>
              </Button>
            )}
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="px-4 max-w-2xl mx-auto mt-5">
          <div className="flex gap-1 border-b border-border/30">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-semibold transition-all relative ${
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="shop-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <div className="px-4 max-w-2xl mx-auto mt-4" ref={menuRef}>
          <AnimatePresence mode="wait">
            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                {/* Context banner */}
                {contextBanners.length > 0 && (
                  <div
                    className="rounded-2xl p-4 border border-border/10"
                    style={{ background: contextBanners[0].gradient }}
                  >
                    <p className="text-sm font-bold text-foreground">{contextBanners[0].emoji} {contextBanners[0].title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{contextBanners[0].subtitle}</p>
                  </div>
                )}

                {/* Description */}
                {shopT.t("description", shop.description) && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {shopT.t("description", shop.description)}
                  </p>
                )}

                {/* Best sellers preview */}
                {catalogItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-foreground">Popular Items</h3>
                      <button
                        onClick={() => setActiveTab("menu")}
                        className="text-[11px] text-primary font-medium flex items-center gap-0.5"
                      >
                        Full Menu <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                      {catalogItems.slice(0, 6).map((item: any) => {
                        const photo = item.photo_url || item.image_url || (Array.isArray(item.photo_urls) && item.photo_urls[0]);
                        return (
                          <button
                            key={item.id}
                            onClick={() => { cart.addItem(item.id, item.price); analytics.trackAddToCart(item.id, item.price, item.currency); toast.success("Added!"); }}
                            className="shrink-0 w-[130px] rounded-xl border border-border/15 bg-card overflow-hidden text-left active:scale-[0.97] transition-transform"
                          >
                            {photo && (
                              <div className="aspect-square bg-muted">
                                <img src={photo} alt={item.name || item.title} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            )}
                            <div className="p-2.5 space-y-0.5">
                              <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">{item.name || item.title}</p>
                              <p className="text-xs font-bold text-primary">{fx.formatPrice(item.price, item.currency)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BoostSlot */}
                <BoostSlotRenderer
                  surface="shop"
                  slotKey="related_businesses_boost"
                  variant="inline"
                  vertical={shop.vertical || undefined}
                  subcategory={shop.subcategory || undefined}
                />
              </motion.div>
            )}

            {/* ── MENU ── */}
            {activeTab === "menu" && (
              <motion.div key="menu" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* Category scroll */}
                {categories.length > 0 && (
                  <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none pb-1">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all ${
                        !activeCategory ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all ${
                          activeCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Currency selector */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">{filteredItems.length} items</p>
                  <Select value={fx.displayCurrency} onValueChange={fx.setDisplayCurrency}>
                    <SelectTrigger className="h-7 w-auto gap-1 text-[10px] border-none bg-muted/40 px-2 rounded-lg">
                      <Globe className="h-3 w-3" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["AED", "USD", "EUR", "GBP", "SAR", "EGP", "MAD", "INR", "PKR"].map(c => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product grid */}
                {filteredItems.length === 0 ? (
                  <div className="py-16 text-center">
                    <Store className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No items available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map((item: any) => {
                      const photo = item.photo_url || item.image_url || (Array.isArray(item.photo_urls) && item.photo_urls[0]);
                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 p-3 rounded-xl border border-border/10 bg-card/50 active:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="text-sm font-semibold text-foreground line-clamp-1">{item.name || item.title}</h4>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
                            )}
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="text-sm font-bold text-primary">{fx.formatPrice(item.price, item.currency)}</span>
                              {item.compare_at_price && item.compare_at_price > item.price && (
                                <span className="text-[10px] text-muted-foreground line-through">{fx.formatPrice(item.compare_at_price, item.currency)}</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-center gap-1.5">
                            {photo && (
                              <img src={photo} alt="" className="w-20 h-20 rounded-xl object-cover bg-muted" loading="lazy" />
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-[10px] font-semibold rounded-lg gap-1"
                              onClick={() => { cart.addItem(item.id, item.price); analytics.trackAddToCart(item.id, item.price, item.currency); }}
                              disabled={cart.loading}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── REVIEWS ── */}
            {activeTab === "reviews" && (
              <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Suspense fallback={<div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
                  <ShopReviews shopId={shop.id} shopOwnerId={shop.user_id} />
                </Suspense>
              </motion.div>
            )}

            {/* ── INFO ── */}
            {activeTab === "info" && (
              <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* About */}
                {shopT.t("description", shop.description) && (
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground">About</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{shopT.t("description", shop.description)}</p>
                  </div>
                )}

                {/* Location */}
                {(shop.address || shop.city) && (
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground">Location</h3>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{shop.address || `${shop.city}${shop.country ? `, ${shop.country}` : ""}`}</span>
                    </div>
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground">Contact</h3>
                  <div className="space-y-2">
                    {shop.contact_phone && (
                      <a href={`tel:${shop.contact_phone}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="h-3.5 w-3.5" /> {shop.contact_phone}
                      </a>
                    )}
                    {shop.contact_whatsapp && (
                      <a href={`https://wa.me/${shop.contact_whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-[#25D366]">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    {shop.contact_email && (
                      <a href={`mailto:${shop.contact_email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Send className="h-3.5 w-3.5" /> {shop.contact_email}
                      </a>
                    )}
                  </div>
                </div>

                {/* Owner link */}
                {user?.id === shop.user_id && (
                  <Link
                    to="/dashboard/my-shop"
                    className="block mt-4 text-center text-xs text-primary font-medium hover:underline"
                  >
                    Manage this shop →
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ CHECKOUT MODAL ═══ */}
        {checkoutMode && (
          <Suspense fallback={null}>
            <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
              <div className="max-w-lg mx-auto pb-10">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="text-sm font-bold">Checkout</h2>
                  <Button variant="ghost" size="sm" onClick={() => setCheckoutMode(false)}>Cancel</Button>
                </div>
                <AdvancedCheckout
                  shop={shop}
                  cartItems={cart.items}
                  total={finalTotal}
                  discount={discount}
                  couponNote={coupon.appliedCoupon ? `Coupon: ${coupon.appliedCoupon.code}` : undefined}
                  currency={shop.currency || "AED"}
                  formatPrice={(n: number, c: string) => fx.formatPrice(n, c)}
                  onComplete={handleCheckoutComplete}
                  onCancel={() => setCheckoutMode(false)}
                />
              </div>
            </div>
          </Suspense>
        )}

        {/* ═══ FLOATING CART ═══ */}
        {cart.itemCount > 0 && !checkoutMode && (
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed bottom-20 left-4 right-4 z-40 bg-primary text-primary-foreground rounded-2xl px-5 py-3.5 shadow-xl flex items-center justify-between font-semibold text-sm max-w-lg mx-auto"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  View Cart · {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
                </span>
                <span className="font-bold">{fx.formatPrice(finalTotal, shop.currency)}</span>
              </motion.button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle className="text-base">Your Cart</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 max-h-[40vh] overflow-y-auto">
                {cart.items.map(ci => (
                  <div key={ci.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20">
                    {ci.photo_url && <img src={ci.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ci.title || "Item"}</p>
                      <p className="text-xs text-muted-foreground">{fx.formatPrice(ci.unit_price, shop.currency)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.updateQuantity(ci.id, ci.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-5 text-center">{ci.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.updateQuantity(ci.id, ci.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => cart.removeItem(ci.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="border-t border-border mt-3 pt-3">
                {coupon.appliedCoupon ? (
                  <div className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-mono font-bold">{coupon.appliedCoupon.code}</span>
                      <span className="text-xs text-primary">-{fx.formatPrice(discount, shop.currency)}</span>
                    </div>
                    <button onClick={coupon.removeCoupon} className="p-1"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="h-8 text-xs uppercase flex-1"
                    />
                    <Button size="sm" variant="outline" className="h-8 text-xs"
                      disabled={coupon.validating || !couponCode.trim()}
                      onClick={() => coupon.applyCoupon(couponCode, cart.total)}>
                      {coupon.validating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-border mt-3 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fx.formatPrice(cart.total, shop.currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-primary">
                    <span>Discount</span>
                    <span>-{fx.formatPrice(discount, shop.currency)}</span>
                  </div>
                )}
                {fx.isConverted && (
                  <p className="text-[9px] text-muted-foreground text-right">≈ converted from {shop.currency || "AED"}</p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">{fx.formatPrice(finalTotal, shop.currency)}</span>
                </div>
                <Button className="w-full h-12 font-semibold rounded-xl" onClick={handleCheckout}>
                  Checkout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </>
  );
}
