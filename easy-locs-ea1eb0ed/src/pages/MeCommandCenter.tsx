import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMeHistoryTypes, getMeFavoritesTypes } from "@/lib/taxonomy/wiring-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useAccountIdentity } from "@/hooks/useAccountIdentity";
import { typedQueries } from "@/lib/db/typed-queries";
import { db } from "@/services/db";
import { countActiveOrders } from "@/repositories/customer-orders.repository";
import { getMerchantDashboardSnapshot } from "@/lib/merchant/merchantDashboard";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useI18n, tSafe } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { ACCENT, CSS } from "@/config/ui";
import PillarPage from "@/components/layout/PillarPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import MeBusinessSwitcher from "@/components/me/MeBusinessSwitcher";
import MeProfileQuality from "@/components/me/MeProfileQuality";
import MeBusinessKpis from "@/components/me/MeBusinessKpis";
import MeStatusBar from "@/components/me/MeStatusBar";
import MeQuickActions from "@/components/me/MeQuickActions";
import {
  User, ChevronRight, LogOut,
  ShoppingBag, Heart, MapPin, CreditCard, Star, Bell, Settings2,
  Store, Receipt, BarChart3, Megaphone, QrCode,
  Building2, Users, Key, FileText, Wrench, CalendarDays, ClipboardList, Home, TrendingUp,
  Shield, Headphones, Scale, Truck,
  Plus, AlertTriangle, Package, Coins, PieChart, Zap,
  Globe, Image, MessageCircle, Eye, FolderCheck, UserCog, Clock, Layers,
  Briefcase, Camera, BadgeCheck, Phone, MapPinned, Compass, Activity,
  BedDouble,
} from "lucide-react";

interface MeItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subtitle: string;
  path: string;
  accent: string;
  badge?: string | number;
}

interface MeSection {
  id: string;
  title: string;
  showIf: "always" | "merchant" | "property" | "driver" | "provider" | "hotelier";
  items: MeItem[];
  cta?: { label: string; path: string };
}

const A = ACCENT;

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
};

interface ShopData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  shop_visibility: string;
  is_verified: boolean;
  active: boolean;
  rating: number | null;
  reviews_count: number | null;
  views_count: number | null;
  currency: string | null;
  theme_color: string | null;
}

export default function MeCommandCenter() {
  useUiEngine({ enabled: true, autoRun: true, observeDom: true });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const profile = useOrbitIdentity();
  const { t } = useI18n();
  const uid = user?.id ?? "";

  const [activeShopId, setActiveShopId] = useState<string | null>(null);

  const { data: shops, isLoading: shopsLoading, error: shopsError } = useQuery<ShopData[]>({
    queryKey: ["me-shops-full", uid],
    enabled: !!uid,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      try {
        const { data, error } = await typedQueries.storefrontPages.selectByOwner(uid);
        if (error) {
          console.warn("[MeCommandCenter] storefront_pages query error:", error);
          return [];
        }
        return (data ?? []).map((d: Record<string, unknown>) => ({
          id: String(d.id ?? ""),
          name: String(d.name ?? ""),
          slug: String(d.slug ?? ""),
          logo_url: d.logo_url as string | null,
          banner_url: d.banner_url as string | null,
          description: d.description as string | null,
          contact_email: d.contact_email as string | null,
          contact_phone: d.contact_phone as string | null,
          address: d.address as string | null,
          city: d.city as string | null,
          country: d.country as string | null,
          latitude: d.latitude as number | null,
          longitude: d.longitude as number | null,
          shop_visibility: String(d.shop_visibility ?? "draft"),
          is_verified: Boolean(d.is_verified),
          active: Boolean(d.active),
          rating: d.rating as number | null,
          reviews_count: d.reviews_count as number | null,
          views_count: d.views_count as number | null,
          currency: d.currency as string | null,
          theme_color: d.theme_color as string | null,
        }));
      } catch (err) {
        console.warn("[MeCommandCenter] storefront_pages fetch failed:", err);
        return [];
      }
    },
  });

  const { data: propCount } = useQuery({
    queryKey: ["me-prop-count", uid],
    enabled: !!uid,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      try {
        const { count } = await typedQueries.properties.countByUser(uid);
        return count ?? 0;
      } catch { return 0; }
    },
  });

  const { data: isDriver } = useQuery({
    queryKey: ["me-driver-check", uid],
    enabled: !!uid,
    staleTime: 120_000,
    retry: 1,
    queryFn: async () => {
      try {
        const { data } = await typedQueries.riderProfiles.existsByUser(uid);
        return !!data;
      } catch { return false; }
    },
  });

  const { data: isProvider } = useQuery({
    queryKey: ["me-provider-check", uid],
    enabled: !!uid,
    staleTime: 120_000,
    retry: 1,
    queryFn: async () => {
      try {
        const { data } = await typedQueries.marketplaceProviders.existsByUser(uid);
        return !!data;
      } catch { return false; }
    },
  });

  const { data: isHotelier } = useQuery({
    queryKey: ["me-hotelier-check", uid],
    enabled: !!uid,
    staleTime: 120_000,
    retry: 1,
    queryFn: async () => {
      try {
        const { data } = await db.from("hotels").select("id").eq("owner_user_id", uid).limit(1).maybeSingle();
        return !!data;
      } catch { return false; }
    },
  });

  const { data: quickStats } = useQuery({
    queryKey: ["me-quick-stats", uid],
    enabled: !!uid,
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      try {
        const [activeOrderCount, loyaltyRes, walletRes] = await Promise.all([
          countActiveOrders(uid).catch(() => 0),
          typedQueries.loyaltyAccounts.selectByUser(uid).catch(() => ({ data: null })),
          typedQueries.walletSummary.selectMainByUser(uid).catch(() => ({ data: null })),
        ]);
        return {
          activeOrders: activeOrderCount,
          loyaltyPoints: Number(loyaltyRes?.data?.points_balance ?? 0),
          loyaltyTier: loyaltyRes?.data?.tier ?? "bronze",
          walletExists: walletRes?.data !== null,
          walletBalance: Number(walletRes?.data?.balance ?? 0),
          walletCurrency: walletRes?.data?.currency ?? "EUR",
        };
      } catch {
        return { activeOrders: 0, loyaltyPoints: 0, loyaltyTier: "bronze", walletExists: false, walletBalance: 0, walletCurrency: "EUR" };
      }
    },
  });

  const shopCount = shops?.length ?? 0;
  const isMerchant = shopCount > 0;
  const isPropertyManager = (propCount ?? 0) > 0;
  const hasDriverRole = isDriver ?? false;
  const hasProviderRole = isProvider ?? false;
  const hasHotelierRole = isHotelier ?? false;

  const activeShop = useMemo(() => {
    if (!shops || shops.length === 0) return null;
    return shops.find(s => s.id === activeShopId) ?? shops[0];
  }, [shops, activeShopId]);

  const { data: merchantKpis } = useQuery({
    queryKey: ["me-merchant-kpis", activeShop?.id],
    enabled: !!activeShop?.id,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      if (!activeShop?.id) return null;
      try {
        const snapshot = await getMerchantDashboardSnapshot(activeShop.id);
        return {
          grossSales: snapshot.grossSales,
          activeOrders: snapshot.activeOrders,
          completedOrders: snapshot.completedOrders,
          productCount: snapshot.availableProducts,
        };
      } catch { return null; }
    },
  });

  const handleSwitchShop = useCallback((id: string) => setActiveShopId(id), []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    toast.success(t("me.signed_out"));
    navigate("/login");
  }, [signOut, navigate, t]);

  const roleLabel = useMemo(() => {
    const roles: string[] = [];
    if (isMerchant) roles.push(t("me.role_merchant"));
    if (isPropertyManager) roles.push(t("me.role_property"));
    if (hasProviderRole) roles.push(t("me.provider_hub"));
    if (hasDriverRole) roles.push(t("me.driver_hub"));
    if (hasHotelierRole) roles.push("Hotel Manager");
    if (roles.length === 0) return t("me.role_personal");
    if (roles.length >= 2) return t("me.role_pro");
    return roles[0];
  }, [isMerchant, isPropertyManager, hasProviderRole, hasDriverRole, hasHotelierRole, t]);

  const meHistoryTypes = useMemo(() => getMeHistoryTypes(), []);
  const meFavoritesTypes = useMemo(() => getMeFavoritesTypes(), []);

  const sections = useMemo<MeSection[]>(() => {
    const merchantId = activeShop?.id ?? "";

    return [
      {
        id: "identity",
        title: t("me.business_identity"),
        showIf: "merchant" as const,
        items: [
          { icon: Store, label: t("me.shop_identity"), subtitle: t("me.shop_identity_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/merchant/onboarding", accent: A.gold },
          { icon: Layers, label: t("me.categories"), subtitle: t("me.categories_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/merchant/onboarding", accent: A.violet },
          { icon: BadgeCheck, label: t("me.verification"), subtitle: t("me.verification_sub"), path: "/settings/business", accent: A.emerald },
        ],
      },
      {
        id: "contact",
        title: t("me.contact_address"),
        showIf: "merchant" as const,
        items: [
          { icon: Phone, label: t("me.contact_info"), subtitle: t("me.contact_info_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/settings/account", accent: A.blue },
          { icon: MapPinned, label: t("me.locations"), subtitle: t("me.locations_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/me/address-book", accent: A.emerald },
          { icon: Clock, label: t("me.hours"), subtitle: t("me.hours_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/settings/business", accent: A.amber },
        ],
      },
      {
        id: "activities",
        title: t("me.activities_services"),
        showIf: "merchant" as const,
        items: [
          { icon: ClipboardList, label: t("me.catalog"), subtitle: t("me.catalog_sub"), path: merchantId ? `/merchant/menu/${merchantId}` : "/merchant/onboarding", accent: A.gold },
          { icon: Receipt, label: t("me.menu"), subtitle: t("me.menu_sub"), path: merchantId ? `/merchant/menu/${merchantId}` : "/merchant/onboarding", accent: A.blue },
          { icon: CalendarDays, label: t("me.service_availability"), subtitle: t("me.service_availability_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/merchant/onboarding", accent: A.cyan },
        ],
      },
      {
        id: "media",
        title: t("me.media_center"),
        showIf: "merchant" as const,
        items: [
          { icon: Camera, label: t("me.gallery"), subtitle: t("me.gallery_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/settings/account", accent: A.rose },
          { icon: Image, label: t("me.media_quality"), subtitle: t("me.media_quality_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/settings/account", accent: A.violet },
        ],
      },
      {
        id: "payments",
        title: t("me.payments_wallet"),
        showIf: "always" as const,
        items: [
          ...(isMerchant ? [
            { icon: Briefcase, label: t("me.wallet_business"), subtitle: t("me.wallet_business_sub"), path: "/merchant/finance", accent: A.gold },
            { icon: Coins, label: t("me.transactions"), subtitle: t("me.transactions_sub"), path: "/merchant/finance", accent: A.emerald },
            { icon: QrCode, label: t("me.checkout"), subtitle: t("me.checkout_sub"), path: "/pos", accent: A.blue },
          ] : []),
          { icon: CreditCard, label: t("me.payment_methods"), subtitle: t("me.payment_methods_sub"), path: "/me/saved-cards", accent: A.emerald },
          { icon: Receipt, label: t("me.receipts"), subtitle: t("me.receipts_sub"), path: "/me/order-receipts", accent: A.blue },
        ],
      },
      {
        id: "orbit",
        title: t("me.orbit_comm"),
        showIf: "merchant" as const,
        items: [
          { icon: MessageCircle, label: t("me.messaging"), subtitle: t("me.messaging_sub"), path: "/orbit", accent: A.blue },
          { icon: Bell, label: t("me.notif_settings"), subtitle: t("me.notif_settings_sub"), path: "/settings/notifications", accent: A.amber },
        ],
      },
      {
        id: "performance",
        title: t("me.performance"),
        showIf: "merchant" as const,
        items: [
          { icon: BarChart3, label: t("me.dashboard_analytics"), subtitle: t("me.dashboard_analytics_sub"), path: "/seller", accent: A.cyan },
          { icon: Package, label: t("me.returns") || "Returns", subtitle: t("me.returns_sub") || "Manage return requests", path: "/merchant/returns", accent: A.orange },
          { icon: Star, label: t("me.reviews"), subtitle: t("me.reviews_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/seller", accent: A.amber },
          { icon: Eye, label: t("me.visibility"), subtitle: t("me.visibility_sub"), path: "/seller/boost", accent: A.violet },
          { icon: Megaphone, label: t("me.promote"), subtitle: t("me.promote_sub"), path: "/seller/boost", accent: A.gold },
        ],
      },
      {
        id: "provider",
        title: t("me.provider_hub"),
        showIf: "provider" as const,
        items: [
          { icon: Activity, label: t("me.provider_dashboard") || "Dashboard", subtitle: t("me.provider_dashboard_sub") || "Overview & KPIs", path: "/provider/dashboard", accent: A.blue },
          { icon: ClipboardList, label: t("me.provider_services"), subtitle: t("me.provider_services_sub"), path: "/provider/services-crud", accent: A.gold },
          { icon: CalendarDays, label: t("me.provider_availability"), subtitle: t("me.provider_availability_sub"), path: "/provider/availability-v2", accent: A.cyan },
          { icon: Compass, label: t("me.provider_calendar") || "Calendar", subtitle: t("me.provider_calendar_sub") || "Upcoming bookings", path: "/provider/calendar", accent: A.emerald },
          { icon: ShoppingBag, label: t("me.provider_bookings"), subtitle: t("me.provider_bookings_sub"), path: "/provider/bookings", accent: A.violet },
          { icon: Coins, label: t("me.provider_earnings") || "Earnings", subtitle: t("me.provider_earnings_sub") || "Revenue & payouts", path: "/provider/earnings", accent: A.amber },
          { icon: Compass, label: t("me.provider_zones"), subtitle: t("me.provider_zones_sub"), path: "/provider/zones", accent: A.slate },
        ],
      },
      {
        id: "hotelier",
        title: "Hotel Management",
        showIf: "hotelier" as const,
        items: [
          { icon: BedDouble, label: "Dashboard", subtitle: "KPIs, bookings & check-in/out", path: "/hotel/dashboard", accent: A.blue },
          { icon: CalendarDays, label: "Occupancy Calendar", subtitle: "Room availability grid", path: "/hotel/calendar", accent: A.emerald },
          { icon: Home, label: "Room Types", subtitle: "Manage rooms & pricing", path: "/hotel/rooms", accent: A.gold },
          { icon: TrendingUp, label: "Seasonal Pricing", subtitle: "Date-based rate overrides", path: "/hotel/pricing", accent: A.amber },
        ],
      },
      {
        id: "essentials",
        title: t("me.essentials"),
        showIf: "always" as const,
        items: (() => {
          const historyTypes = meHistoryTypes;
          const favoritesTypes = meFavoritesTypes;
          return [
            { icon: ShoppingBag, label: t("me.orders"), subtitle: t("me.orders_sub"), path: "/my-orders", accent: A.blue, badge: (quickStats?.activeOrders ?? 0) > 0 ? quickStats!.activeOrders : undefined },
            { icon: Heart, label: t("me.favorites"), subtitle: `${favoritesTypes.length} ${t("me.favorites_sub")}`, path: "/favorites", accent: A.rose },
            { icon: Heart, label: t("me.wishlist") || "Wishlist", subtitle: t("me.wishlist_sub") || "Saved products", path: "/me/wishlist", accent: A.violet },
            { icon: MapPin, label: t("me.addresses"), subtitle: t("me.addresses_sub"), path: "/me/address-book", accent: A.emerald },
            { icon: Star, label: t("me.loyalty"), subtitle: `${historyTypes.length} ${t("me.loyalty_sub")}`, path: "/me/loyalty-history", accent: A.amber },
            { icon: PieChart, label: t("me.spending"), subtitle: t("me.spending_sub"), path: "/me/spending-insights", accent: A.cyan },
          ];
        })(),
      },
      {
        id: "property",
        title: t("me.property_mgmt"),
        showIf: "property" as const,
        items: [
          { icon: Building2, label: t("me.property_management"), subtitle: t("me.property_management_sub"), path: "/property-hub", accent: A.gold, badge: propCount },
          { icon: Key, label: t("me.leases"), subtitle: t("me.leases_sub"), path: "/dashboard/leases", accent: A.emerald },
          { icon: TrendingUp, label: t("me.rent_cockpit"), subtitle: t("me.rent_sub"), path: "/dashboard/rent-cockpit", accent: A.amber },
          { icon: Wrench, label: t("me.maintenance"), subtitle: t("me.maintenance_sub"), path: "/dashboard/interventions", accent: A.slate },
          { icon: FileText, label: t("me.documents"), subtitle: t("me.docs_sub"), path: "/dashboard/documents", accent: A.violet },
          { icon: ClipboardList, label: t("me.inventory"), subtitle: t("me.inventory_sub"), path: "/dashboard/furniture-inventory", accent: A.cyan },
          { icon: CalendarDays, label: t("me.calendar"), subtitle: t("me.calendar_sub"), path: "/dashboard/calendar", accent: A.rose },
          { icon: Home, label: t("me.listings"), subtitle: t("me.listings_sub"), path: "/dashboard/real-estate", accent: A.emerald },
        ],
        cta: { label: t("me.add_property"), path: "/dashboard/property/add" },
      },
      {
        id: "driver",
        title: t("me.driver_hub"),
        showIf: "driver" as const,
        items: [
          { icon: Truck, label: t("me.driver_hub"), subtitle: t("me.driver_hub_sub"), path: "/driver/dashboard", accent: A.blue },
          { icon: TrendingUp, label: t("me.analytics"), subtitle: t("me.analytics_sub"), path: "/driver/earnings", accent: A.emerald },
          { icon: ClipboardList, label: t("me.orders"), subtitle: t("me.orders_sub"), path: "/driver/missions-board", accent: A.amber },
        ],
      },
      {
        id: "settings",
        title: t("me.settings_control"),
        showIf: "always" as const,
        items: [
          { icon: User, label: t("me.personal_info"), subtitle: t("me.personal_sub"), path: "/settings/account", accent: A.blue },
          { icon: Globe, label: t("me.language_region"), subtitle: t("me.language_region_sub"), path: "/settings/preferences", accent: A.cyan },
          { icon: Shield, label: t("me.security"), subtitle: t("me.security_sub"), path: "/settings/security", accent: A.emerald },
          { icon: Settings2, label: t("me.preferences"), subtitle: t("me.preferences_sub"), path: "/settings/preferences", accent: A.violet },
          ...(isMerchant ? [
            { icon: Eye, label: t("me.publication"), subtitle: t("me.publication_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/settings/business", accent: A.gold },
            { icon: UserCog, label: t("me.permissions"), subtitle: t("me.permissions_sub"), path: "/settings/security", accent: A.slate },
          ] : []),
        ],
      },
      {
        id: "documents",
        title: t("me.documents_compliance"),
        showIf: "merchant" as const,
        items: [
          { icon: FolderCheck, label: t("me.business_docs"), subtitle: t("me.business_docs_sub"), path: "/settings/business", accent: A.blue },
          { icon: BadgeCheck, label: t("me.kyc_kyb"), subtitle: t("me.kyc_kyb_sub"), path: "/settings/business", accent: A.emerald },
          { icon: FileText, label: t("me.tax_docs"), subtitle: t("me.tax_docs_sub"), path: "/dashboard/documents", accent: A.violet },
        ],
      },
      {
        id: "team",
        title: t("me.team_roles"),
        showIf: "merchant" as const,
        items: [
          { icon: Users, label: t("me.staff"), subtitle: t("me.staff_sub"), path: merchantId ? `/merchant/store-settings/${merchantId}` : "/settings/business", accent: A.blue },
          { icon: UserCog, label: t("me.access_control"), subtitle: t("me.access_control_sub"), path: "/settings/security", accent: A.slate },
        ],
      },
      {
        id: "support",
        title: t("me.support"),
        showIf: "always" as const,
        items: [
          { icon: Headphones, label: t("me.help"), subtitle: t("me.help_sub"), path: "/settings/support", accent: A.violet },
          { icon: AlertTriangle, label: t("me.disputes"), subtitle: t("me.disputes_sub"), path: "/support/tickets", accent: A.orange },
          { icon: Scale, label: t("me.legal"), subtitle: t("me.legal_sub"), path: "/legal", accent: A.slate },
        ],
      },
    ];
  }, [t, propCount, quickStats, activeShop, isMerchant, meHistoryTypes, meFavoritesTypes]);

  const visibleSections = useMemo(() => {
    return sections.filter((s) => {
      if (s.showIf === "always") return true;
      if (s.showIf === "merchant") return isMerchant;
      if (s.showIf === "property") return isPropertyManager;
      if (s.showIf === "driver") return hasDriverRole;
      if (s.showIf === "provider") return hasProviderRole;
      if (s.showIf === "hotelier") return hasHotelierRole;
      return true;
    });
  }, [sections, isMerchant, isPropertyManager, hasDriverRole, hasProviderRole, hasHotelierRole]);

  const acctId = useAccountIdentity();
  const avatarUrl = acctId.avatarUrl || profile?.avatarUrl || user?.user_metadata?.avatar_url;
  const displayName = acctId.displayName;
  const initials = acctId.initials;

  const isBusiness = acctId.accountType === "business" || isMerchant || isPropertyManager || hasDriverRole || hasProviderRole || hasHotelierRole;

  const isInitialLoading = shopsLoading && !shops;

  if (!user) {
    return (
      <PillarPage noPadding className="max-w-md mx-auto px-[var(--section-px)] py-12 flex flex-col items-center gap-4 text-center">
        <SEOHead title={t("me.seo_title")} description={t("me.seo_desc")} noindex />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${A.gold}1A` }}>
          <User className="w-7 h-7" style={{ color: A.gold }} />
        </div>
        <p className="text-sm font-bold text-foreground">{tSafe(t, "errors.load_failed", "Failed to load")}</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {tSafe(t, "me.sign_in_required", "Please sign in to view your profile.")}
        </p>
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: A.gold, color: A.navy }}
        >
          {tSafe(t, "common.sign_in", "Sign In")}
        </button>
      </PillarPage>
    );
  }

  if (isInitialLoading) {
    return (
      <PillarPage noPadding className="max-w-md mx-auto px-[var(--section-px)] py-6">
        <SEOHead title={t("me.seo_title")} description={t("me.seo_desc")} noindex />
        <div className="flex flex-col gap-[var(--section-gap-compact)]">
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-muted/30">
            <div className="w-14 h-14 rounded-2xl skeleton-premium" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded skeleton-premium" />
              <div className="h-3 w-20 rounded skeleton-premium" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-3 bg-muted/20 space-y-2">
              <div className="h-3 w-24 rounded skeleton-premium" />
              <div className="h-10 w-full rounded-xl skeleton-premium" />
              <div className="h-10 w-full rounded-xl skeleton-premium" />
            </div>
          ))}
        </div>
      </PillarPage>
    );
  }

  return (
    <PillarPage noPadding className="max-w-md mx-auto px-[var(--section-px)] py-6 overflow-x-clip">
      <SEOHead title={t("me.seo_title")} description={t("me.seo_desc")} noindex />
      <ErrorBoundary>
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-[var(--section-gap-compact)]">

        <motion.button
          variants={fadeUp}
          onClick={() => navigate("/settings/account")}
          className={`w-full flex items-center gap-4 p-4 rounded-3xl active:scale-[0.98] transition-all text-left relative overflow-hidden ${CSS.appCard} border border-accent/10`}
          style={{ background: `linear-gradient(135deg, ${A.navy}0F, ${A.navy}05)` }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none" style={{ background: `radial-gradient(circle, ${A.gold} 0%, transparent 70%)` }} />
          {avatarUrl ? (
            <img loading="eager" src={avatarUrl} alt={`${displayName} avatar`} className="w-14 h-14 rounded-2xl object-cover shrink-0" style={{ boxShadow: `0 0 0 2px ${A.gold}33` }} />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 shadow-lg" style={{ background: A.navy, color: "#fff" }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground line-clamp-1 break-words">{displayName}</p>
            <p className="text-[0.6875rem] text-muted-foreground truncate font-mono mt-0.5">
              EL-{(user?.id || "").replace(/-/g, "").substring(0, 8).toUpperCase()}
            </p>
            <span
              className="inline-block mt-1 text-[0.625rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: `${A.gold}1A`, color: A.gold }}
            >
              {roleLabel}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" style={{ color: `${A.gold}66` }} />
        </motion.button>

        {isMerchant && activeShop && (
          <motion.div variants={fadeUp}>
            <MeStatusBar
              isVerified={activeShop.is_verified}
              publishStatus={activeShop.shop_visibility}
              walletActive={quickStats?.walletExists ?? false}
              orbitActive={!!profile?.orbitId}
            />
          </motion.div>
        )}

        {quickStats && !isMerchant && (
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate("/my-orders/active")}
              className="app-stat-chip text-center active:scale-[0.97] transition-transform"
              style={{ background: `${A.blue}0D`, borderColor: `${A.blue}1A` }}
            >
              <Package className="w-5 h-5 mx-auto mb-1" style={{ color: A.blue }} />
              <p className="text-lg font-extrabold text-foreground tabular-nums">{quickStats.activeOrders}</p>
              <p className="text-[0.625rem] text-muted-foreground font-semibold uppercase tracking-wide">{t("me.active")}</p>
            </button>
            <button
              onClick={() => navigate("/me/loyalty-history")}
              className="app-stat-chip text-center active:scale-[0.97] transition-transform"
              style={{ background: `${A.amber}0D`, borderColor: `${A.amber}1A` }}
            >
              <Coins className="w-5 h-5 mx-auto mb-1" style={{ color: A.amber }} />
              <p className="text-lg font-extrabold text-foreground tabular-nums">{quickStats.loyaltyPoints}</p>
              <p className="text-[0.625rem] text-muted-foreground font-semibold uppercase tracking-wide">{t("me.points")}</p>
            </button>
            <button
              onClick={() => navigate("/wallet")}
              className="app-stat-chip text-center active:scale-[0.97] transition-transform"
              style={{ background: `${A.emerald}0D`, borderColor: `${A.emerald}1A` }}
            >
              <Zap className="w-5 h-5 mx-auto mb-1" style={{ color: A.emerald }} />
              <p className="text-lg font-extrabold text-foreground tabular-nums">{Number(quickStats.walletBalance ?? 0).toFixed(0)}</p>
              <p className="text-[0.625rem] text-muted-foreground font-semibold uppercase tracking-wide">{quickStats.walletCurrency}</p>
            </button>
          </motion.div>
        )}

        {isMerchant && shops && shops.length > 1 && (
          <motion.div variants={fadeUp}>
            <MeBusinessSwitcher shops={shops} activeShopId={activeShopId ?? shops[0]?.id ?? null} onSwitch={handleSwitchShop} />
          </motion.div>
        )}

        {isMerchant && activeShop && (
          <motion.div variants={fadeUp}>
            <MeProfileQuality
              shopName={activeShop.name}
              hasDescription={!!(activeShop.description && activeShop.description.length > 10)}
              hasLogo={!!activeShop.logo_url}
              hasCover={!!activeShop.banner_url}
              hasPhone={!!activeShop.contact_phone}
              hasEmail={!!activeShop.contact_email}
              hasAddress={!!(activeShop.address && activeShop.city)}
              hasCategories={false}
              hasHours={false}
              hasWallet={quickStats?.walletExists ?? false}
              isVerified={activeShop.is_verified}
            />
          </motion.div>
        )}

        {isMerchant && merchantKpis && (
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: merchantKpis.grossSales >= 1000 ? `${(merchantKpis.grossSales / 1000).toFixed(1)}k` : merchantKpis.grossSales.toFixed(0), label: t("me.merchant_kpi_revenue"), color: A.gold, path: "/merchant/finance" },
              { value: String(merchantKpis.activeOrders), label: t("me.merchant_kpi_active"), color: A.blue, path: "/merchant/orders" },
              { value: String(merchantKpis.completedOrders), label: t("me.merchant_kpi_completed"), color: A.emerald, path: "/seller" },
              { value: String(merchantKpis.productCount), label: t("me.merchant_kpi_products"), color: A.violet, path: activeShop?.id ? `/merchant/menu/${activeShop.id}` : "/merchant/onboarding" },
            ].map((kpi, i) => (
              <button
                key={i}
                onClick={() => navigate(kpi.path)}
                className="app-stat-chip text-center py-2.5 active:scale-[0.97] transition-transform"
                style={{ background: `${kpi.color}08`, borderColor: `${kpi.color}14` }}
              >
                <p className="text-lg font-extrabold text-foreground leading-none tabular-nums">{kpi.value}</p>
                <p className="text-[0.625rem] text-muted-foreground font-semibold uppercase tracking-wider mt-1 line-clamp-2 break-words">{kpi.label}</p>
              </button>
            ))}
          </motion.div>
        )}

        {isMerchant && activeShop && (
          <motion.div variants={fadeUp}>
            <MeQuickActions merchantId={activeShop.id} />
          </motion.div>
        )}

        {!isMerchant && !hasProviderRole && (
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate("/merchant/onboarding")}
              className={`flex items-center gap-2.5 p-3 ${CSS.appCard} active:scale-[0.98] transition-transform text-left`}
              style={{ borderColor: `${A.gold}1F`, background: `${A.gold}08` }}
            >
              <div className="app-list-row-icon shrink-0" style={{ background: `${A.gold}14` }}>
                <Store className="w-4 h-4" style={{ color: A.gold }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground line-clamp-2 break-words">{t("me.open_shop")}</p>
                <p className="text-[0.625rem] text-muted-foreground line-clamp-2 break-words">{t("me.open_shop_sub")}</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/activities")}
              className={`flex items-center gap-2.5 p-3 ${CSS.appCard} active:scale-[0.98] transition-transform text-left`}
              style={{ borderColor: `${A.cyan}1F`, background: `${A.cyan}08` }}
            >
              <div className="app-list-row-icon shrink-0" style={{ background: `${A.cyan}14` }}>
                <Compass className="w-4 h-4" style={{ color: A.cyan }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground line-clamp-2 break-words">{t("me.become_provider")}</p>
                <p className="text-[0.625rem] text-muted-foreground line-clamp-2 break-words">{t("me.become_provider_sub")}</p>
              </div>
            </button>
          </motion.div>
        )}

        {!isPropertyManager && (
          <motion.button
            variants={fadeUp}
            onClick={() => navigate("/dashboard/property/add")}
            className={`w-full flex items-center gap-3 p-3 ${CSS.appCard} active:scale-[0.98] transition-transform text-left`}
            style={{ borderColor: `${A.blue}1F`, background: `${A.blue}08` }}
          >
            <div className="app-list-row-icon shrink-0" style={{ background: `${A.blue}14` }}>
              <Building2 className="w-4 h-4" style={{ color: A.blue }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">{t("me.add_first_property")}</p>
              <p className="text-[0.625rem] text-muted-foreground">{t("me.add_first_property_sub")}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: `${A.blue}66` }} />
          </motion.button>
        )}

        {isBusiness && (
          <motion.div variants={fadeUp} className="pt-2 pb-1 px-1">
            <div className="page-section__divider mb-3" />
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: A.gold }} />
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: A.navy }}>
                {t("me.business_cockpit")}
              </h2>
            </div>
          </motion.div>
        )}

        {visibleSections.map((section) => (
          <motion.div
            key={section.id}
            variants={fadeUp}
            className={CSS.appCard}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h2 className="app-section-label">{section.title}</h2>
              {section.cta && (
                <button
                  onClick={() => navigate(section.cta!.path)}
                  className="app-section-link active:scale-95 transition-transform"
                >
                  <Plus className="w-3 h-3" />
                  {section.cta.label}
                </button>
              )}
            </div>

            {section.items.map((item) => (
              <button
                key={item.path + item.label}
                onClick={() => navigate(item.path)}
                className="w-full app-list-row text-left"
              >
                <div
                  className="app-list-row-icon shrink-0"
                  style={{ background: item.accent.replace(")", " / 0.06)") }}
                >
                  <item.icon style={{ color: item.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[0.8125rem] font-semibold text-foreground block leading-tight line-clamp-1 break-words">{item.label}</span>
                  <span className="text-[0.625rem] text-muted-foreground/60 leading-tight line-clamp-1 break-words block">{item.subtitle}</span>
                </div>
                {item.badge != null && Number(item.badge) > 0 && (
                  <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-md shrink-0" style={{ background: `${A.gold}1A`, color: A.gold }}>
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/15 shrink-0" />
              </button>
            ))}
          </motion.div>
        ))}

        <motion.button
          variants={fadeUp}
          onClick={handleSignOut}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 ${CSS.appCard} active:scale-[0.98] transition-transform`}
          style={{ background: "hsl(var(--destructive) / 0.04)", borderColor: "hsl(var(--destructive) / 0.08)" }}
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-sm font-bold text-destructive">{t("me.sign_out")}</span>
        </motion.button>

        <p className="text-center text-[0.625rem] text-muted-foreground/20 pb-4">{t("me.app_version")}</p>
      </motion.div>
      </ErrorBoundary>
    </PillarPage>
  );
}
