import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { supabase } from "@/integrations/supabase/client";
import { typedQueries } from "@/lib/db/typed-queries";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import {
  User, ChevronRight, LogOut,
  ShoppingBag, Heart, MapPin, CreditCard, Star, Bell, Settings2,
  Store, Receipt, BarChart3, Megaphone, QrCode,
  Building2, Users, Key, FileText, Wrench, CalendarDays, ClipboardList, Home, TrendingUp,
  Shield, Headphones, Scale, Truck,
  Plus, AlertTriangle, Package, Coins, PieChart, Zap,
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
  showIf?: "always" | "merchant" | "property" | "driver";
  items: MeItem[];
  cta?: { label: string; path: string };
}

const A = {
  blue: "hsl(210 80% 52%)",
  rose: "hsl(350 65% 55%)",
  amber: "hsl(38 92% 50%)",
  emerald: "hsl(152 60% 42%)",
  violet: "hsl(270 60% 55%)",
  cyan: "hsl(190 75% 46%)",
  slate: "hsl(220 15% 50%)",
  orange: "hsl(25 90% 52%)",
  primary: "hsl(38 65% 56%)",
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.035 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function MeCommandCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useOrbitIdentity();
  const { t } = useI18n();

  const uid = user?.id ?? "";

  const { data: shopCount } = useQuery({
    queryKey: ["me-shop-count", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await typedQueries.storefrontPages.countByOwner(uid);
      return count ?? 0;
    },
  });

  const { data: propCount } = useQuery({
    queryKey: ["me-prop-count", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await typedQueries.properties.countByUser(uid);
      return count ?? 0;
    },
  });

  const { data: isDriver } = useQuery({
    queryKey: ["me-driver-check", uid],
    enabled: !!uid,
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await typedQueries.riderProfiles.existsByUser(uid);
      return !!data;
    },
  });

  const { data: quickStats } = useQuery({
    queryKey: ["me-quick-stats", uid],
    enabled: !!uid,
    staleTime: 30_000,
    queryFn: async () => {
      const [ordersRes, loyaltyRes, walletRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("customer_user_id", uid)
          .in("status", ["paid", "confirmed", "preparing", "ready_for_pickup", "driver_search", "driver_assigned", "picked_up", "on_the_way"]),
        typedQueries.loyaltyAccounts.selectByUser(uid),
        typedQueries.walletSummary.selectMainByUser(uid),
      ]);
      return {
        activeOrders: ordersRes.count ?? 0,
        loyaltyPoints: Number(loyaltyRes?.data?.points_balance ?? 0),
        loyaltyTier: loyaltyRes?.data?.tier ?? "bronze",
        walletBalance: Number(walletRes?.data?.balance ?? 0),
        walletCurrency: walletRes?.data?.currency ?? "EUR",
      };
    },
  });

  const isMerchant = (shopCount ?? 0) > 0;
  const isPropertyManager = (propCount ?? 0) > 0;
  const hasDriverRole = isDriver ?? false;

  const sections = useMemo<MeSection[]>(() => [
    {
      id: "essentials",
      title: t("me.essentials"),
      showIf: "always",
      items: [
        { icon: ShoppingBag, label: t("me.orders"), subtitle: t("me.orders_sub"), path: "/my-orders", accent: A.blue, badge: (quickStats?.activeOrders ?? 0) > 0 ? quickStats!.activeOrders : undefined },
        { icon: Heart, label: t("me.favorites"), subtitle: t("me.favorites_sub"), path: "/favorites", accent: A.rose },
        { icon: MapPin, label: t("me.addresses"), subtitle: t("me.addresses_sub"), path: "/me/address-book", accent: A.emerald },
        { icon: Star, label: t("me.loyalty"), subtitle: t("me.loyalty_sub"), path: "/me/loyalty-history", accent: A.amber },
        { icon: PieChart, label: t("me.spending") || "Spending Insights", subtitle: t("me.spending_sub") || "Track your expenses", path: "/me/spending-insights", accent: A.cyan },
      ],
    },
    {
      id: "wallet",
      title: t("me.client_account"),
      showIf: "always",
      items: [
        { icon: CreditCard, label: t("me.payment_methods"), subtitle: t("me.payment_methods_sub"), path: "/me/saved-cards", accent: A.emerald },
        { icon: Receipt, label: t("me.receipts") || "Receipts", subtitle: t("me.receipts_sub") || "Payment history", path: "/me/order-receipts", accent: A.blue },
      ],
    },
    {
      id: "property",
      title: t("me.property_mgmt"),
      showIf: "property",
      items: [
        { icon: Building2, label: "Gestion Immo", subtitle: "Biens, locataires, loyers", path: "/me/gestion-immo", accent: A.primary, badge: propCount },
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
      id: "shop",
      title: t("me.my_shop"),
      showIf: "merchant",
      items: [
        { icon: Store, label: t("me.storefront"), subtitle: t("me.storefront_sub"), path: "/dashboard/my-shops", accent: A.primary, badge: shopCount },
        { icon: Receipt, label: t("me.shop_orders"), subtitle: t("me.shop_orders_sub"), path: "/merchant/orders", accent: A.blue },
        { icon: QrCode, label: t("me.pos"), subtitle: t("me.pos_sub"), path: "/pos", accent: A.emerald },
        { icon: BarChart3, label: t("me.analytics"), subtitle: t("me.analytics_sub"), path: "/seller", accent: A.cyan },
        { icon: Megaphone, label: t("me.promote"), subtitle: t("me.promote_sub"), path: "/seller/boost", accent: A.amber },
      ],
    },
    {
      id: "driver",
      title: t("me.driver_hub"),
      showIf: "driver",
      items: [
        { icon: Truck, label: t("me.driver_hub"), subtitle: t("me.driver_hub_sub"), path: "/driver/dashboard", accent: A.blue },
        { icon: TrendingUp, label: t("me.analytics"), subtitle: t("me.analytics_sub"), path: "/driver/earnings", accent: A.emerald },
        { icon: ClipboardList, label: t("me.orders"), subtitle: t("me.orders_sub"), path: "/driver/missions-board", accent: A.amber },
      ],
    },
    {
      id: "account",
      title: t("me.account"),
      showIf: "always",
      items: [
        { icon: User, label: t("me.personal_info"), subtitle: t("me.personal_sub"), path: "/settings/account", accent: A.blue },
        { icon: Shield, label: t("me.security"), subtitle: t("me.security_sub"), path: "/settings/security", accent: A.emerald },
        { icon: Bell, label: t("me.notifications"), subtitle: t("me.notifications_sub"), path: "/settings/notifications", accent: A.amber },
        { icon: Settings2, label: t("me.preferences"), subtitle: t("me.preferences_sub"), path: "/settings/preferences", accent: A.violet },
      ],
    },
    {
      id: "support",
      title: t("me.support"),
      showIf: "always",
      items: [
        { icon: Headphones, label: t("me.help"), subtitle: t("me.help_sub"), path: "/settings/support", accent: A.violet },
        { icon: AlertTriangle, label: t("me.disputes"), subtitle: t("me.disputes_sub"), path: "/support/tickets", accent: A.orange },
        { icon: Scale, label: t("me.legal"), subtitle: t("me.legal_sub"), path: "/legal", accent: A.slate },
      ],
    },
  ], [t, propCount, shopCount, quickStats]);

  const visibleSections = useMemo(() => {
    return sections.filter((s) => {
      if (s.showIf === "always") return true;
      if (s.showIf === "merchant") return isMerchant;
      if (s.showIf === "property") return isPropertyManager;
      if (s.showIf === "driver") return hasDriverRole;
      return true;
    });
  }, [sections, isMerchant, isPropertyManager, hasDriverRole]);

  const avatarUrl = profile?.avatarUrl || user?.user_metadata?.avatar_url;
  const displayName = profile?.displayName || user?.user_metadata?.display_name || t("me.user_fallback");
  const initials = displayName.split(/[\s@]/).map((w: string) => w[0]?.toUpperCase()).join("").slice(0, 2);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success(t("me.signed_out"));
    navigate("/login");
  };

  const roleLabel = isMerchant && isPropertyManager
    ? t("me.role_pro")
    : isMerchant
    ? t("me.role_merchant")
    : isPropertyManager
    ? t("me.role_property")
    : hasDriverRole
    ? t("me.driver_hub")
    : t("me.role_personal");

  return (
    <div className="app-mobile-page max-w-md mx-auto px-4 py-4">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">

        <motion.button
          variants={fadeUp}
          onClick={() => navigate("/settings/account")}
          className="w-full flex items-center gap-4 p-4 rounded-3xl active:scale-[0.98] transition-all text-left relative overflow-hidden app-card"
          style={{ background: "linear-gradient(135deg, hsl(220 40% 18% / 0.06), hsl(220 40% 18% / 0.02))", border: "1px solid hsl(38 65% 56% / 0.1)" }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(38 65% 56%) 0%, transparent 70%)" }} />
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" style={{ boxShadow: "0 0 0 2px hsl(38 65% 56% / 0.2)" }} />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-lg" style={{ background: "hsl(220 40% 18%)", color: "hsl(0 0% 100%)" }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
              EL-{(user?.id || "").replace(/-/g, "").substring(0, 8).toUpperCase()}
            </p>
            <span
              className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "hsl(38 65% 56% / 0.1)", color: "hsl(38 65% 56%)" }}
            >
              {roleLabel}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" style={{ color: "hsl(38 65% 56% / 0.4)" }} />
        </motion.button>

        {quickStats && (
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate("/my-orders/active")}
              className="app-stat-chip text-center active:scale-[0.97] transition-transform"
              style={{ background: "hsl(210 80% 52% / 0.05)", borderColor: "hsl(210 80% 52% / 0.1)" }}
            >
              <Package className="w-5 h-5 mx-auto mb-1" style={{ color: A.blue }} />
              <p className="text-lg font-bold text-foreground">{quickStats.activeOrders}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{t("me.active") || "Active"}</p>
            </button>
            <button
              onClick={() => navigate("/me/loyalty-history")}
              className="app-stat-chip text-center active:scale-[0.97] transition-transform"
              style={{ background: "hsl(38 92% 50% / 0.05)", borderColor: "hsl(38 92% 50% / 0.1)" }}
            >
              <Coins className="w-5 h-5 mx-auto mb-1" style={{ color: A.amber }} />
              <p className="text-lg font-bold text-foreground">{quickStats.loyaltyPoints}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{t("me.points") || "Points"}</p>
            </button>
            <button
              onClick={() => navigate("/wallet")}
              className="app-stat-chip text-center active:scale-[0.97] transition-transform"
              style={{ background: "hsl(152 60% 42% / 0.05)", borderColor: "hsl(152 60% 42% / 0.1)" }}
            >
              <Zap className="w-5 h-5 mx-auto mb-1" style={{ color: A.emerald }} />
              <p className="text-lg font-bold text-foreground">{Number(quickStats.walletBalance ?? 0).toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{quickStats.walletCurrency}</p>
            </button>
          </motion.div>
        )}

        {!isMerchant && (
          <motion.button
            variants={fadeUp}
            onClick={() => navigate("/merchant/onboarding")}
            className="w-full flex items-center gap-3 p-3.5 app-card active:scale-[0.98] transition-transform text-left"
            style={{ borderColor: "hsl(38 65% 56% / 0.12)", background: "hsl(38 65% 56% / 0.03)" }}
          >
            <div className="app-list-row-icon shrink-0" style={{ background: "hsl(38 65% 56% / 0.08)" }}>
              <Store style={{ color: "hsl(38 65% 56%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground">{t("me.open_shop")}</p>
              <p className="text-[10px] text-muted-foreground">{t("me.open_shop_sub")}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(38 65% 56% / 0.4)" }} />
          </motion.button>
        )}

        {!isPropertyManager && (
          <motion.button
            variants={fadeUp}
            onClick={() => navigate("/dashboard/property/add")}
            className="w-full flex items-center gap-3 p-3.5 app-card active:scale-[0.98] transition-transform text-left"
            style={{ borderColor: "hsl(210 80% 52% / 0.12)", background: "hsl(210 80% 52% / 0.03)" }}
          >
            <div className="app-list-row-icon shrink-0" style={{ background: "hsl(210 80% 52% / 0.08)" }}>
              <Building2 style={{ color: A.blue }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground">{t("me.add_first_property")}</p>
              <p className="text-[10px] text-muted-foreground">{t("me.add_first_property_sub")}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(210 80% 52% / 0.4)" }} />
          </motion.button>
        )}

        {visibleSections.map((section) => (
          <motion.div
            key={section.id}
            variants={fadeUp}
            className="app-card"
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

            {section.items.map((item, idx) => (
              <button
                key={item.path + item.label}
                onClick={() => navigate(item.path)}
                className="w-full app-list-row text-left"
              >
                <div
                  className="app-list-row-icon shrink-0"
                  style={{ background: item.accent.startsWith("hsl(var(") ? "hsl(38 65% 56% / 0.06)" : item.accent.replace(")", " / 0.06)") }}
                >
                  <item.icon style={{ color: item.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-foreground block leading-tight truncate">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground/60 leading-tight truncate block">{item.subtitle}</span>
                </div>
                {item.badge != null && Number(item.badge) > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0" style={{ background: "hsl(38 65% 56% / 0.1)", color: "hsl(38 65% 56%)" }}>
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
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 app-card active:scale-[0.98] transition-transform"
          style={{ background: "hsl(var(--destructive) / 0.04)", borderColor: "hsl(var(--destructive) / 0.08)" }}
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-sm font-bold text-destructive">{t("me.sign_out")}</span>
        </motion.button>

        <p className="text-center text-[10px] text-muted-foreground/20 pb-4">{t("me.app_version")}</p>
      </motion.div>
    </div>
  );
}
