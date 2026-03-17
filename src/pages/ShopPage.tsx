/**
 * ShopPage — Public storefront for buyers.
 * Route: /shop/{slug} or /s/{slug}
 * CONSOLIDATED: 1 component per function, lazy-loaded sections.
 */
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { buildAppUrl } from "@/lib/app-domain";
import ShareButtons from "@/components/public/ShareButtons";
import { useStorefrontCart } from "@/hooks/useStorefrontCart";
import { useStorefrontCoupon } from "@/hooks/useStorefrontCoupon";
import { useStorefrontWishlist } from "@/hooks/useStorefrontWishlist";
import { useStorefrontCurrency } from "@/hooks/useStorefrontCurrency";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, MapPin, ShoppingCart, Plus, Minus, Trash2, Phone, Mail, MessageCircle, Send, CheckCircle2, Store, Tag, X, Heart, Globe, QrCode } from "lucide-react";
import { ScanQrButton } from "@/components/qr/UniversalQrWidgets";
import { useState, useEffect, lazy, Suspense } from "react";
import { toast } from "sonner";
import { useStorefrontAnalytics } from "@/hooks/useStorefrontAnalytics";
import { useShopTranslation } from "@/hooks/useShopTranslation";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Link } from "react-router-dom";

// Lazy-loaded secondary sections — only loaded when scrolled into view or needed
const ShopReviews = lazy(() => import("@/components/storefront/ShopReviews"));
const BundleManager = lazy(() => import("@/components/storefront/BundleManager"));
const FlashSales = lazy(() => import("@/components/storefront/FlashSales"));
const AuctionManager = lazy(() => import("@/components/storefront/AuctionManager"));
const LoyaltyDashboard = lazy(() => import("@/components/storefront/LoyaltyDashboard"));
const GiftCardManager = lazy(() => import("@/components/storefront/GiftCardManager"));
const ReturnsRefundEngine = lazy(() => import("@/components/storefront/ReturnsRefundEngine"));
const AffiliateProgram = lazy(() => import("@/components/storefront/AffiliateProgram"));
const CustomerSupport = lazy(() => import("@/components/storefront/CustomerSupport"));
const LiveShopping = lazy(() => import("@/components/storefront/LiveShopping"));
const SmartNotifications = lazy(() => import("@/components/storefront/SmartNotifications"));
const DigitalProducts = lazy(() => import("@/components/storefront/DigitalProducts"));
const PeerMarketplace = lazy(() => import("@/components/storefront/PeerMarketplace"));
const ReverseAuctionRFQ = lazy(() => import("@/components/storefront/ReverseAuctionRFQ"));
const WishlistSaveLater = lazy(() => import("@/components/storefront/WishlistSaveLater"));
const ProductComparator = lazy(() => import("@/components/storefront/ProductComparator"));
const SubscriptionManager = lazy(() => import("@/components/storefront/SubscriptionManager"));
const MultiCurrencyTax = lazy(() => import("@/components/storefront/MultiCurrencyTax"));
const GamificationEngine = lazy(() => import("@/components/storefront/GamificationEngine"));
const AdvancedCheckout = lazy(() => import("@/components/storefront/AdvancedCheckout"));
const AIShoppingAssistant = lazy(() => import("@/components/storefront/AIShoppingAssistant"));
const ReorderEngine = lazy(() => import("@/components/storefront/ReorderEngine"));
const TrustScoreBadge = lazy(() => import("@/components/storefront/TrustScoreBadge"));

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

const SectionLoader = () => (
  <div className="flex items-center justify-center py-6">
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  </div>
);

export default function ShopPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { user } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [checkoutMode, setCheckoutMode] = useState(false);

  const { data: shop, isLoading } = useQuery({
    queryKey: ["storefront-page", shopSlug],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("*")
        .eq("slug", shopSlug!)
        .maybeSingle();
      return data;
    },
    enabled: !!shopSlug,
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["storefront-catalog", shop?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("catalog_items")
        .select("*, storefront_catalog_categories(name)")
        .eq("shop_id", shop.id)
        .eq("available", true)
        .order("sort_order");
      return data || [];
    },
    enabled: !!shop?.id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["storefront-categories", shop?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_catalog_categories")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: !!shop?.id,
  });

  const cart = useStorefrontCart(shop?.id);
  const coupon = useStorefrontCoupon(shop?.id);
  const wishlist = useStorefrontWishlist(shop?.id);
  const analytics = useStorefrontAnalytics(shop?.id);
  const shopT = useShopTranslation(shop?.id);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const fx = useStorefrontCurrency(shop?.currency || shop?.default_currency || "EUR");
  const filteredItems = activeCategory
    ? catalogItems.filter((i: any) => i.category_id === activeCategory)
    : catalogItems;

  const discount = coupon.appliedCoupon?.discountAmount || 0;
  const finalTotal = Math.max(0, cart.total - discount);

  // Track page view when shop loads
  useEffect(() => {
    if (shop?.id) analytics.trackPageView();
  }, [shop?.id]);

  const handleCheckout = () => {
    if (!user) { toast.error("Please sign in to checkout"); return; }
    if (cart.items.length === 0) return;
    analytics.trackCheckout(finalTotal, shop.currency);
    setCheckoutMode(true);
    setCartOpen(false);
  };

  const handleCheckoutComplete = async (orderId: string) => {
    analytics.trackPurchase(orderId, finalTotal, shop.currency);
    if (coupon.appliedCoupon) {
      await coupon.recordUsage(orderId);
      coupon.removeCoupon();
    }
    await cart.clearCart();
    setCheckoutMode(false);
    toast.success("Order placed! The seller will confirm soon.");
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!shop) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Store className="h-12 w-12 text-muted-foreground/50" />
      <p className="text-muted-foreground">Shop not found</p>
    </div>
  );

  if (shop.shop_visibility === "private" && !inviteToken && shop.user_id !== user?.id) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Store className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">This shop is private. You need an invitation link.</p>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${shop.name} | Shop`}
        description={shop.description || `Browse ${shop.name}'s catalog`}
        ogImage={shop.banner_url || shop.logo_url}
        canonical={buildAppUrl(`/s/${shop.slug}`)}
      />

      <div className="min-h-screen bg-background pb-20">
        {/* PASS137: Sticky header with back nav */}
        <MobilePageHeader
          title={shop.name}
          subtitle={shop.city ? `${shop.city}${shop.country ? `, ${shop.country}` : ""}` : undefined}
          backTo="/discover"
          actions={
            user?.id === shop.user_id ? (
              <Link to="/dashboard/my-shop" className="text-[11px] text-primary font-medium hover:underline">
                Manage →
              </Link>
            ) : undefined
          }
        />

        {/* Banner */}
        {shop.banner_url && (
          <div className="h-40 sm:h-56 bg-muted overflow-hidden">
            <img src={shop.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Shop header */}
        <div className="max-w-2xl mx-auto px-4 -mt-10 relative z-10">
          <div className="flex items-end gap-4 mb-4">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-20 h-20 rounded-2xl border-4 border-background object-cover shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-background bg-primary/10 flex items-center justify-center shadow-md">
                <Store className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground truncate">{shopT.t("name", shop.name)}</h1>
                {shop.is_verified && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              </div>
              {(shopT.t("tagline", shop.tagline)) && <p className="text-sm text-muted-foreground truncate">{shopT.t("tagline", shop.tagline)}</p>}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {shop.city && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {shop.city}{shop.country ? `, ${shop.country}` : ""}
              </span>
            )}
            <Badge variant="outline" className="text-[10px]">{catalogItems.length} items</Badge>
            <Suspense fallback={null}>
              <TrustScoreBadge shopId={shop.id} compact />
            </Suspense>
            <Select value={fx.displayCurrency} onValueChange={fx.setDisplayCurrency}>
              <SelectTrigger className="h-6 w-auto gap-1 text-[10px] border-none bg-muted/50 px-2">
                <Globe className="h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["EUR", "USD", "GBP", "CHF", "AED", "MAD", "XOF", "CAD", "JPY", "CNY", "INR", "BRL", "TRY", "NGN"].map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ShareButtons type="host" slug={shop.slug} title={shop.name} />
          </div>

          {(shopT.t("description", shop.description)) && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{shopT.t("description", shop.description)}</p>
          )}

          {/* Contact buttons */}
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
            {shop.contact_phone && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" asChild>
                <a href={`tel:${shop.contact_phone}`}><Phone className="h-3 w-3" /> Call</a>
              </Button>
            )}
            {shop.contact_whatsapp && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-[#25D366] border-[#25D366]/30 shrink-0" asChild>
                <a href={`https://wa.me/${shop.contact_whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
              </Button>
            )}
            {shop.contact_telegram && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-[#0088cc] border-[#0088cc]/30 shrink-0" asChild>
                <a href={`https://t.me/${shop.contact_telegram}`} target="_blank" rel="noopener noreferrer">
                  <Send className="h-3 w-3" /> Telegram
                </a>
              </Button>
            )}
            {shop.contact_email && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" asChild>
                <a href={`mailto:${shop.contact_email}`}><Mail className="h-3 w-3" /> Email</a>
              </Button>
            )}
            <ScanQrButton label="Scan & Pay" size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" />
          </div>

          {/* Category filters */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none pb-1">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                  !activeCategory ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                All
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                    activeCategory === cat.id ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Catalog grid */}
          {filteredItems.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No items yet</CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map((item: any) => {
                const photo = item.photo_url || (Array.isArray(item.photo_urls) && item.photo_urls[0]);
                return (
                  <Card key={item.id} className="overflow-hidden relative">
                    {photo && (
                      <div className="aspect-square bg-muted relative">
                        <img src={photo} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        {user && (
                          <button
                            onClick={() => wishlist.toggle(item.id)}
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center transition-colors"
                          >
                            <Heart className={`h-3.5 w-3.5 transition-colors ${wishlist.isFavorite(item.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                          </button>
                        )}
                      </div>
                    )}
                    <CardContent className="p-3 space-y-1.5">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</h3>
                      {item.storefront_catalog_categories?.name && (
                        <Badge variant="secondary" className="text-[9px]">{item.storefront_catalog_categories.name}</Badge>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-sm font-bold text-primary">{fx.formatPrice(item.price, item.currency)}</span>
                          {item.compare_at_price && item.compare_at_price > item.price && (
                            <span className="text-[10px] text-muted-foreground line-through ml-1">{fx.formatPrice(item.compare_at_price, item.currency)}</span>
                          )}
                        </div>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { cart.addItem(item.id, item.price); analytics.trackAddToCart(item.id, item.price, item.currency); }} disabled={cart.loading}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* PASS133: Quick reorder for returning buyers */}
          {user && (
            <Suspense fallback={null}>
              <div className="mt-4">
                <ReorderEngine shopId={shop.id} />
              </div>
            </Suspense>
          )}

          {/* Secondary sections — lazy loaded */}
          <Suspense fallback={<SectionLoader />}>
            <div className="mt-6">
              <BundleManager shopId={shop.id} mode="display" onAddBundle={(bundleId: string, price: number) => cart.addItem(bundleId, price)} />
            </div>
            <div className="mt-6">
              <FlashSales shopId={shop.id} mode="buyer" catalogItems={catalogItems} onAddToCart={(id: string, p: number) => cart.addItem(id, p)} formatPrice={(n: number, c: string) => fx.formatPrice(n, c)} />
            </div>
            <div className="mt-6">
              <AuctionManager shopId={shop.id} mode="buyer" />
            </div>
          </Suspense>

          {/* Authenticated buyer sections */}
          {user && (
            <Suspense fallback={<SectionLoader />}>
              <div className="mt-4 space-y-4">
                <WishlistSaveLater shopId={shop.id} mode="buyer" catalogItems={catalogItems} />
                <ProductComparator shopId={shop.id} catalogItems={catalogItems} mode="buyer" />
                <LoyaltyDashboard shopId={shop.id} mode="buyer" />
                <GiftCardManager shopId={shop.id} mode="buyer" />
                <SubscriptionManager shopId={shop.id} />
                <ReturnsRefundEngine shopId={shop.id} mode="buyer" />
                <AffiliateProgram shopId={shop.id} shopSlug={shop.slug} mode="buyer" />
                <MultiCurrencyTax shopId={shop.id} mode="buyer" />
                <CustomerSupport shopId={shop.id} mode="buyer" />
                <SmartNotifications shopId={shop.id} mode="buyer" />
                <GamificationEngine shopId={shop.id} mode="buyer" />
                <ReverseAuctionRFQ shopId={shop.id} mode="buyer" />
              </div>
            </Suspense>
          )}

          {/* Public sections */}
          <Suspense fallback={<SectionLoader />}>
            <div className="mt-6 space-y-4">
              <DigitalProducts shopId={shop.id} mode="buyer" />
              <PeerMarketplace shopId={shop.id} mode="buyer" />
              <LiveShopping shopId={shop.id} mode="buyer" catalogItems={catalogItems} />
              <ShopReviews shopId={shop.id} shopOwnerId={shop.user_id} />
            </div>
          </Suspense>
        </div>

        {/* AI Shopping Assistant */}
        <Suspense fallback={null}>
          <AIShoppingAssistant shopId={shop.id} shopName={shop.name} catalogItems={catalogItems} />
        </Suspense>

        {/* Checkout Modal */}
        {checkoutMode && (
          <Suspense fallback={<SectionLoader />}>
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
                  currency={shop.currency || "EUR"}
                  formatPrice={(n: number, c: string) => fx.formatPrice(n, c)}
                  onComplete={handleCheckoutComplete}
                  onCancel={() => setCheckoutMode(false)}
                />
              </div>
            </div>
          </Suspense>
        )}

        {/* Floating cart button */}
        {cart.itemCount > 0 && (
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <button className="fixed bottom-6 right-4 z-50 bg-primary text-primary-foreground rounded-full px-5 py-3 shadow-lg flex items-center gap-2 font-semibold text-sm">
                <ShoppingCart className="h-4 w-4" />
                {cart.itemCount} · {fx.formatPrice(finalTotal, shop.currency)}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Your Cart</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 max-h-[40vh] overflow-y-auto">
                {cart.items.map(ci => (
                  <div key={ci.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    {ci.photo_url && <img src={ci.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ci.title || "Item"}</p>
                      <p className="text-xs text-muted-foreground">{fx.formatPrice(ci.unit_price, shop.currency)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.updateQuantity(ci.id, ci.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{ci.quantity}</span>
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

              {/* Coupon section */}
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
                {coupon.error && <p className="text-[10px] text-destructive mt-1">{coupon.error}</p>}
              </div>

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
                  <p className="text-[9px] text-muted-foreground text-right">≈ converted from {shop.currency || "EUR"}</p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">{fx.formatPrice(finalTotal, shop.currency)}</span>
                </div>
                <Button className="w-full h-12 font-semibold" onClick={handleCheckout}>
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
