/**
 * MyShopPage — Seller dashboard for managing their storefront.
 * CONSOLIDATED: 1 component per function, lazy-loaded tabs.
 */
import { useState, lazy, Suspense, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SmartShopBuilder from "@/components/storefront/SmartShopBuilder";
import ShopShareEngine from "@/components/storefront/ShopShareEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Package, ShoppingBag, Settings, ExternalLink, Copy, Check, Loader2, Handshake, BarChart3, Rocket, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

// Lazy-loaded tab modules — only loaded when the tab is active
const CatalogManager = lazy(() => import("@/components/storefront/CatalogManager"));
const OrdersManager = lazy(() => import("@/components/storefront/OrdersManager"));
const StorefrontDealRoom = lazy(() => import("@/components/storefront/StorefrontDealRoom"));
const ShopAnalytics = lazy(() => import("@/components/storefront/ShopAnalytics"));
const LaunchAudit = lazy(() => import("@/components/storefront/LaunchAudit"));
const BoostSelectorLazy = lazy(() => import("@/components/monetization/BoostSelectorWrapper"));
const SellerFinance = lazy(() => import("@/components/storefront/SellerFinance"));
const CouponManager = lazy(() => import("@/components/storefront/CouponManager"));
const ShippingManager = lazy(() => import("@/components/storefront/ShippingManager"));
const ShopReviews = lazy(() => import("@/components/storefront/ShopReviews"));
const InventoryManager = lazy(() => import("@/components/storefront/InventoryManager"));
const SmartInventoryAlerts = lazy(() => import("@/components/storefront/SmartInventoryAlerts"));
const BundleManager = lazy(() => import("@/components/storefront/BundleManager"));
const DeliveryDispatch = lazy(() => import("@/components/storefront/DeliveryDispatch"));
const AuctionManager = lazy(() => import("@/components/storefront/AuctionManager"));
const FlashSales = lazy(() => import("@/components/storefront/FlashSales"));
const GiftCardManager = lazy(() => import("@/components/storefront/GiftCardManager"));
const ReturnsRefundEngine = lazy(() => import("@/components/storefront/ReturnsRefundEngine"));
const SubscriptionManager = lazy(() => import("@/components/storefront/SubscriptionManager"));
const LoyaltyDashboard = lazy(() => import("@/components/storefront/LoyaltyDashboard"));
const AffiliateProgram = lazy(() => import("@/components/storefront/AffiliateProgram"));
const MultiCurrencyTax = lazy(() => import("@/components/storefront/MultiCurrencyTax"));
const CustomerSupport = lazy(() => import("@/components/storefront/CustomerSupport"));
const LiveShopping = lazy(() => import("@/components/storefront/LiveShopping"));
const SmartNotifications = lazy(() => import("@/components/storefront/SmartNotifications"));
const BulkProductManager = lazy(() => import("@/components/storefront/BulkProductManager"));
const DigitalProducts = lazy(() => import("@/components/storefront/DigitalProducts"));
const PeerMarketplace = lazy(() => import("@/components/storefront/PeerMarketplace"));
const ReverseAuctionRFQ = lazy(() => import("@/components/storefront/ReverseAuctionRFQ"));
const MultiVendorDashboard = lazy(() => import("@/components/storefront/MultiVendorDashboard"));
const WarehouseManager = lazy(() => import("@/components/storefront/WarehouseManager"));
const GamificationEngine = lazy(() => import("@/components/storefront/GamificationEngine"));
const MultiStoreManager = lazy(() => import("@/components/storefront/MultiStoreManager"));
const SmartCatalogBuilder = lazy(() => import("@/components/storefront/SmartCatalogBuilder"));
const SellerAnalyticsV2 = lazy(() => import("@/components/storefront/SellerAnalyticsV2"));
const TrustScoreBadge = lazy(() => import("@/components/storefront/TrustScoreBadge"));
const RiskFlagsDashboard = lazy(() => import("@/components/storefront/RiskFlagsDashboard"));
const GrowthDashboard = lazy(() => import("@/components/storefront/GrowthDashboard"));
const NotificationBell = lazy(() => import("@/components/storefront/NotificationBell"));
const InvoiceList = lazy(() => import("@/components/storefront/InvoiceList"));
const SellerOnboarding = lazy(() => import("@/components/storefront/SellerOnboarding"));
const MerchantCRM = lazy(() => import("@/components/storefront/MerchantCRM"));
const NotificationIntelligence = lazy(() => import("@/components/storefront/NotificationIntelligence"));
// Settings-only (loaded inline since settings tab is simple)
const AICategorySuggest = lazy(() => import("@/components/storefront/AICategorySuggest"));
const PrivateInviteManager = lazy(() => import("@/components/storefront/PrivateInviteManager"));
const TranslationManager = lazy(() => import("@/components/storefront/TranslationManager"));
const ShopSEOManager = lazy(() => import("@/components/storefront/ShopSEOManager"));
const BusinessHierarchy = lazy(() => import("@/components/storefront/BusinessHierarchy"));

const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

const TABS = [
  { id: "catalog", label: "Catalog", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "deals", label: "Deals", icon: Handshake },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "launch", label: "Launch", icon: Rocket },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type TabId = typeof TABS[number]["id"];

export default function MyShopPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("catalog");
  const [copied, setCopied] = useState(false);

  // PASS123: Realtime sync for seller orders
  // Imported dynamically to keep bundle light

  const { data: shop, isLoading, refetch } = useQuery({
    queryKey: ["my-storefront", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const shopUrl = shop ? `${window.location.origin}/s/${shop.slug}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const updateShop = async (field: string, value: any) => {
    if (!shop) return;
    await (supabase as any).from("storefront_pages").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", shop.id);
    refetch();
    toast.success("Updated");
  };

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </DashboardLayout>
  );

  if (!shop) return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <SmartShopBuilder />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-6">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{shop.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{shop.shop_visibility}</Badge>
                <button onClick={copyLink} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <a href={`/s/${shop.slug}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3 inline" /> Preview
                </a>
                <ShopShareEngine shopName={shop.name} shopSlug={shop.slug} shopDescription={shop.description} shopImage={shop.logo_url} />
                <Suspense fallback={null}><NotificationBell shopId={shop.id} onOpen={() => { setTab("analytics"); haptic("light"); }} /></Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* PASS127: Seller onboarding guide */}
        <div className="px-4 pb-2">
          <Suspense fallback={null}><SellerOnboarding shopId={shop.id} /></Suspense>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); haptic("selection"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0"
                style={{
                  background: active ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.5)",
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: `1px solid ${active ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
                }}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="px-4">
          <Suspense fallback={<TabLoader />}>
            {tab === "catalog" && (
              <div className="space-y-4">
                <SmartCatalogBuilder shopId={shop.id} />
                <CatalogManager shopId={shop.id} />
                <BulkProductManager shopId={shop.id} />
                <FlashSales shopId={shop.id} mode="seller" />
                <AuctionManager shopId={shop.id} mode="seller" />
              </div>
            )}
            {tab === "orders" && (
              <div className="space-y-4">
                <OrdersManager shopId={shop.id} />
                <MerchantCRM shopId={shop.id} />
                <ReturnsRefundEngine shopId={shop.id} mode="seller" />
                <DeliveryDispatch shopId={shop.id} />
                <WarehouseManager shopId={shop.id} />
              </div>
            )}
            {tab === "deals" && <StorefrontDealRoom shopId={shop.id} isSeller />}
            {tab === "finance" && (
              <div className="space-y-4">
                <SellerFinance shopId={shop.id} />
                <MultiVendorDashboard shopId={shop.id} />
                <AffiliateProgram shopId={shop.id} shopSlug={shop.slug} mode="seller" />
                <MultiCurrencyTax shopId={shop.id} mode="seller" />
                <InvoiceList shopId={shop.id} />
                <SubscriptionManager shopId={shop.id} />
                <GiftCardManager shopId={shop.id} mode="seller" />
                <LoyaltyDashboard shopId={shop.id} mode="seller" />
                <DigitalProducts shopId={shop.id} mode="seller" />
                <PeerMarketplace shopId={shop.id} mode="seller" />
                <ReverseAuctionRFQ shopId={shop.id} mode="seller" />
              </div>
            )}
            {tab === "analytics" && (
              <div className="space-y-4">
                <SellerAnalyticsV2 shopId={shop.id} />
                <NotificationIntelligence shopId={shop.id} />
                <GrowthDashboard shopId={shop.id} />
                <TrustScoreBadge shopId={shop.id} />
                <RiskFlagsDashboard shopId={shop.id} />
                <ShopAnalytics shopId={shop.id} />
                <SmartNotifications shopId={shop.id} mode="seller" />
                <CustomerSupport shopId={shop.id} mode="seller" />
                <LiveShopping shopId={shop.id} mode="seller" />
                <GamificationEngine shopId={shop.id} mode="seller" />
                <MultiStoreManager />
              </div>
            )}
            {tab === "launch" && (
              <div className="space-y-4">
                <LaunchAudit shopId={shop.id} />
                <Card>
                  <CardContent className="p-4">
                    <Suspense fallback={<TabLoader />}>
                      <BoostSelectorLazy targetType="shop" targetId={shop.id} shopId={shop.id} onSuccess={() => refetch()} />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>
            )}
            {tab === "settings" && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Shop Details</h4>
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input defaultValue={shop.name} onBlur={e => { if (e.target.value !== shop.name) updateShop("name", e.target.value); }} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Tagline</Label>
                      <Input defaultValue={shop.tagline || ""} onBlur={e => updateShop("tagline", e.target.value || null)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea defaultValue={shop.description || ""} onBlur={e => updateShop("description", e.target.value || null)} className="mt-1" rows={3} />
                    </div>
                    <div>
                      <Label className="text-xs">Visibility</Label>
                      <Select value={shop.shop_visibility} onValueChange={v => updateShop("shop_visibility", v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">🌐 Public</SelectItem>
                          <SelectItem value="unlisted">🔗 Unlisted</SelectItem>
                          <SelectItem value="private">🔒 Private</SelectItem>
                          <SelectItem value="draft">📝 Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Contact</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Phone</Label>
                        <Input defaultValue={shop.contact_phone || ""} onBlur={e => updateShop("contact_phone", e.target.value || null)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">WhatsApp</Label>
                        <Input defaultValue={shop.contact_whatsapp || ""} onBlur={e => updateShop("contact_whatsapp", e.target.value || null)} className="mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Telegram</Label>
                        <Input defaultValue={shop.contact_telegram || ""} onBlur={e => updateShop("contact_telegram", e.target.value || null)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input defaultValue={shop.contact_email || ""} onBlur={e => updateShop("contact_email", e.target.value || null)} className="mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Branding</h4>
                    <div>
                      <Label className="text-xs">Logo URL</Label>
                      <Input defaultValue={shop.logo_url || ""} onBlur={e => updateShop("logo_url", e.target.value || null)} className="mt-1" placeholder="https://..." />
                    </div>
                    <div>
                      <Label className="text-xs">Banner URL</Label>
                      <Input defaultValue={shop.banner_url || ""} onBlur={e => updateShop("banner_url", e.target.value || null)} className="mt-1" placeholder="https://..." />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Location</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input defaultValue={shop.city || ""} onBlur={e => updateShop("city", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Country</Label>
                        <Input defaultValue={shop.country || ""} onBlur={e => updateShop("country", e.target.value)} className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Geo Scope</Label>
                      <Select value={shop.geo_scope || "city"} onValueChange={v => updateShop("geo_scope", v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="worldwide">🌍 Worldwide</SelectItem>
                          <SelectItem value="country">🏳️ Country</SelectItem>
                          <SelectItem value="city">🏙️ City</SelectItem>
                          <SelectItem value="radius">📍 Radius</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <AICategorySuggest shopId={shop.id} onAccept={(s) => { updateShop("vertical", s.vertical); updateShop("subcategory", s.category); updateShop("tags", s.tags); }} />
                {shop.shop_visibility === "private" && <PrivateInviteManager shopId={shop.id} shopSlug={shop.slug} />}
                <TranslationManager shopId={shop.id} />
                <CouponManager shopId={shop.id} />
                <BundleManager shopId={shop.id} mode="manage" />
                <InventoryManager shopId={shop.id} />
                <SmartInventoryAlerts shopId={shop.id} />
                <ShippingManager shopId={shop.id} />
                <ShopSEOManager shopId={shop.id} shopSlug={shop.slug} currentData={shop} />
                <ShopReviews shopId={shop.id} shopOwnerId={shop.user_id} />
                <BusinessHierarchy />
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  );
}
