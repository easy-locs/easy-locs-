/**
 * V7Bundle — Consolidated V7 pillar pages + bottom nav.
 * Single-file bundle: MobileBottomNav, MyBusinessHub, MyShopsPage, ShopsPage.
 * Routes: /shops, /business, /business/my-shops
 */
import React, { Suspense, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3, Boxes, Briefcase, Building2, Compass, CreditCard,
  List, Map, Plus, Search, Settings, ShoppingBag, Store, Truck,
  Users, Wallet, X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";

/* ── Fallback translations ── */

const FALLBACKS: Record<string, string> = {
  "nav.marketplace": "Marketplace",
  "nav.shops": "Shops",
  "nav.business": "Business",
  "nav.property": "Property",
  "business.hub_title": "My Business",
  "business.hub_subtitle": "Manage all your business operations.",
  "business.control_center": "Control Center",
  "business.my_shops": "My Shops",
  "business.my_shops_desc": "Manage your storefronts",
  "business.orders": "Orders",
  "business.orders_desc": "Track and manage orders",
  "business.pos": "POS Terminal",
  "business.pos_desc": "Point of sale",
  "business.wallet": "Wallet & Finance",
  "business.wallet_desc": "Transactions and balance",
  "business.delivery": "Delivery",
  "business.delivery_desc": "Dispatch and tracking",
  "business.customers": "Customers",
  "business.customers_desc": "CRM and contacts",
  "business.analytics": "Analytics",
  "business.analytics_desc": "Sales and performance",
  "business.inventory": "Inventory",
  "business.inventory_desc": "Stock management",
  "business.settings": "Settings",
  "business.settings_desc": "Account and preferences",
  "shops.title": "Shops",
  "shops.search_placeholder": "Search shops...",
  "shops.no_public_shops": "No shops found",
  "shops.no_public_shops_desc": "Try a different search or category.",
  "shops.my_shops": "My Shops",
  "shops.create_new": "Create New Shop",
  "shops.create_desc": "Set up a new storefront",
  "shops.no_my_shops": "No shops yet",
  "shops.no_my_shops_desc": "Create your first shop to start selling.",
  "shops.manage": "Manage Shop",
  "shops.open_public": "View Public Shop",
  "shops.status_published": "Published",
  "shops.status_draft": "Draft",
  "shops.category.all": "All",
  "shops.category.food": "Food",
  "shops.category.fashion": "Fashion",
  "shops.category.tech": "Tech",
  "shops.category.beauty": "Beauty",
  "shops.category.home": "Home",
  "shops.category.services": "Services",
  "shops.view.list": "List",
  "shops.view.map": "Map",
  "shops.results_count_one": "shop",
  "shops.results_count_other": "shops",
  "shops.sponsored": "Sponsored",
};

/* ── Helpers ── */

function useTr() {
  const { t } = useI18n();
  return (key: string) => {
    const val = t(key);
    return val && val !== key ? val : FALLBACKS[key] || key.split(".").pop() || "";
  };
}

function useRankedFeedInline<T>(items: T[]) {
  return {
    feed: (items || []).map((item) => ({ item, sponsored: false })),
  };
}

/* ── MobileBottomNav ── */

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const tr = useTr();

  if (pathname.startsWith("/app")) return null;

  const items = [
    {
      icon: Compass, labelKey: "nav.marketplace", path: "/discover",
      match: (p: string) =>
        p.startsWith("/discover") || p.startsWith("/search") || p.startsWith("/explore") ||
        p.startsWith("/listing/") || p.startsWith("/trending") || p.startsWith("/nearby") ||
        p.startsWith("/top-rated") || p.startsWith("/rentals") || p.startsWith("/book/"),
    },
    {
      icon: Store, labelKey: "nav.shops", path: "/shops",
      match: (p: string) => p === "/shops" || p.startsWith("/shops/") || p.startsWith("/s/"),
    },
    {
      icon: Briefcase, labelKey: "nav.business", path: "/business",
      match: (p: string) =>
        p.startsWith("/business") || p === "/pos" || p === "/my-orders" ||
        p.startsWith("/dashboard/my-shop") || p.startsWith("/dashboard/seller") ||
        p.startsWith("/dashboard/wallet") || p.startsWith("/dashboard/driver") ||
        p.startsWith("/dashboard/reporting") || p.startsWith("/dashboard/communication") ||
        p.startsWith("/dashboard/deals") || p.startsWith("/dashboard/ops"),
    },
    {
      icon: Building2, labelKey: "nav.property", path: "/property-hub",
      match: (p: string) =>
        p.startsWith("/property-hub") || p.startsWith("/dashboard/properties") ||
        p.startsWith("/dashboard/property/") || p.startsWith("/dashboard/tenants") ||
        p.startsWith("/dashboard/leases") || p.startsWith("/dashboard/finances") ||
        p.startsWith("/dashboard/buildings") || p.startsWith("/dashboard/accounting") ||
        p.startsWith("/dashboard/real-estate") || p.startsWith("/tenant"),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom"
      role="tablist"
      aria-label="Main navigation"
      style={{
        background: "hsl(var(--card) / 0.95)",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
        borderTop: "1px solid hsl(var(--border) / 0.4)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -4px 24px hsl(var(--background) / 0.3)",
      }}
    >
      <div className="flex items-stretch justify-around h-[60px]">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          const label = tr(item.labelKey);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              role="tab"
              aria-selected={active}
              aria-label={label}
              className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all min-w-[44px] min-h-[44px] max-w-[80px] active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg relative ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="v7-tab-indicator"
                  className="absolute top-0 left-3 right-3 h-[2.5px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={`h-5 w-5 shrink-0 transition-colors ${active ? "text-accent" : ""}`} />
              <span className={`text-[10px] leading-tight transition-colors ${active ? "text-accent font-bold" : "font-medium"}`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/* ── MyBusinessHub ── */

export function MyBusinessHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tr = useTr();

  const MODULES = [
    { labelKey: "business.my_shops", descKey: "business.my_shops_desc", path: "/business/my-shops", icon: Store, gradient: "from-violet-500 to-fuchsia-500" },
    { labelKey: "business.orders", descKey: "business.orders_desc", path: "/my-orders", icon: ShoppingBag, gradient: "from-blue-500 to-cyan-500" },
    { labelKey: "business.pos", descKey: "business.pos_desc", path: "/pos", icon: CreditCard, gradient: "from-amber-500 to-orange-500" },
    { labelKey: "business.wallet", descKey: "business.wallet_desc", path: "/dashboard/wallet", icon: Wallet, gradient: "from-emerald-500 to-green-500" },
    { labelKey: "business.delivery", descKey: "business.delivery_desc", path: "/dashboard/driver", icon: Truck, gradient: "from-sky-500 to-indigo-500" },
    { labelKey: "business.customers", descKey: "business.customers_desc", path: "/dashboard/communication", icon: Users, gradient: "from-pink-500 to-rose-500" },
    { labelKey: "business.analytics", descKey: "business.analytics_desc", path: "/dashboard/reporting", icon: BarChart3, gradient: "from-teal-500 to-cyan-500" },
    { labelKey: "business.inventory", descKey: "business.inventory_desc", path: "/dashboard/ops", icon: Boxes, gradient: "from-lime-500 to-emerald-500" },
    { labelKey: "business.settings", descKey: "business.settings_desc", path: "/dashboard/seller", icon: Settings, gradient: "from-slate-500 to-zinc-500" },
  ];

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <div className="px-4 pt-4 pb-6 space-y-4 max-w-lg mx-auto w-full">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.06))",
            border: "1px solid hsl(var(--primary) / 0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{tr("business.control_center")}</p>
              <p className="text-base font-semibold text-foreground/80 mt-0.5">{tr("business.hub_title")}</p>
              <p className="text-xs text-muted-foreground mt-1">{tr("business.hub_subtitle")}</p>
            </div>
          </div>
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
        </motion.div>

        {/* Module cards */}
        <div className="space-y-3">
          {MODULES.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.button
                key={mod.path}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                onClick={() => { haptic("light"); navigate(mod.path); }}
                className="w-full rounded-3xl border border-border/50 bg-card p-5 text-left shadow-sm transition-transform duration-150 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{tr(mod.labelKey)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{tr(mod.descKey)}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── MyShopsPage ── */

export function MyShopsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tr = useTr();

  const { data: shops, isLoading } = useQuery({
    queryKey: ["my-shops", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, published, vertical, city, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{tr("shops.my_shops")}</h1>
      </div>

      <div className="px-4 pb-6 space-y-3 max-w-lg mx-auto w-full">
        {/* Create shop CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => { haptic("light"); navigate("/dashboard/my-shop"); }}
          className="mb-5 w-full rounded-3xl border border-border/50 bg-card p-5 text-left shadow-sm transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{tr("shops.create_new")}</p>
              <p className="text-xs text-muted-foreground">{tr("shops.create_desc")}</p>
            </div>
          </div>
        </motion.button>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!shops || shops.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Store className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">{tr("shops.no_my_shops")}</p>
            <p className="text-xs text-muted-foreground mt-1">{tr("shops.no_my_shops_desc")}</p>
          </div>
        )}

        {/* Shop cards */}
        <div className="space-y-4">
          {shops?.map((shop: any, i: number) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="rounded-3xl border border-border/40 bg-card overflow-hidden shadow-sm"
            >
              <div className="p-5">
                <div className="flex items-start gap-3.5 mb-4">
                  {shop.logo_url ? (
                    <img src={shop.logo_url} alt={shop.name} className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-1 ring-border/20" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                    {shop.city && <p className="text-xs text-muted-foreground mt-1">{shop.city}</p>}
                    <div className="mt-1.5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        shop.published
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${shop.published ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {shop.published ? tr("shops.status_published") : tr("shops.status_draft")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => { haptic("light"); navigate(`/dashboard/my-shop/${shop.id}`); }}
                    className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {tr("shops.manage")}
                  </button>
                  <button
                    onClick={() => { haptic("light"); navigate(`/s/${shop.slug}`); }}
                    className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    {tr("shops.open_public")}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── InlineShopsMapView ── */

function InlineShopsMapView({
  shops,
  radiusKm = 25,
  onOpenShop,
}: {
  shops: any[];
  radiusKm?: number;
  onOpenShop?: (slug: string) => void;
}) {
  return (
    <div className="h-[520px] overflow-auto bg-muted/20 p-4">
      <div className="mb-3 text-sm font-medium text-muted-foreground">
        Map view placeholder — radius: {radiusKm} km
      </div>
      <div className="space-y-3">
        {shops?.map((shop) => (
          <button
            key={shop.id}
            onClick={() => onOpenShop?.(shop.slug)}
            className="w-full rounded-2xl border border-border bg-background p-4 text-left"
          >
            <div className="font-semibold">{shop.name}</div>
            {shop.city && <div className="text-sm text-muted-foreground">{shop.city}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── ShopsPage ── */

export function ShopsPage() {
  const navigate = useNavigate();
  const tr = useTr();

  const CATEGORIES = [
    { id: "all", labelKey: "shops.category.all" },
    { id: "food", labelKey: "shops.category.food" },
    { id: "fashion", labelKey: "shops.category.fashion" },
    { id: "tech", labelKey: "shops.category.tech" },
    { id: "beauty", labelKey: "shops.category.beauty" },
    { id: "home", labelKey: "shops.category.home" },
    { id: "services", labelKey: "shops.category.services" },
  ];

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [radius, setRadius] = useState(25);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops-browse"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, vertical, boost_tier, boost_until, created_at, lat, lng, city")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((s: any) => ({ ...s, title: s.name }));
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!shops) return [];
    let result = shops;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s: any) =>
        s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== "all") {
      result = result.filter((s: any) => s.vertical?.toLowerCase() === activeCategory);
    }
    return result;
  }, [shops, searchQuery, activeCategory]);

  const { feed } = useRankedFeedInline(filtered);

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{tr("shops.title")}</h1>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr("shops.search_placeholder")}
            className="h-11 w-full rounded-2xl border border-border/40 bg-muted/40 pl-10 pr-10 text-sm outline-none ring-0 transition-all focus:border-primary/40 focus:bg-background"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 pb-2 overflow-x-auto scrollbar-none">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); haptic("selection"); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tr(cat.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* View toggle + radius/count */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <div className="flex rounded-xl overflow-hidden border border-border/30">
          <button
            onClick={() => { setViewMode("list"); haptic("selection"); }}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            {tr("shops.view.list")}
          </button>
          <button
            onClick={() => { setViewMode("map"); haptic("selection"); }}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "map" ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <Map className="h-3.5 w-3.5" />
            {tr("shops.view.map")}
          </button>
        </div>

        {viewMode === "map" ? (
          <div className="relative ml-auto">
            <button
              onClick={() => { setShowRadiusMenu(!showRadiusMenu); haptic("light"); }}
              className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent"
            >
              {radius} km
            </button>
            {showRadiusMenu && (
              <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 min-w-[80px] bg-card border border-border shadow-lg">
                {[5, 10, 25, 50, 100].map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRadius(r); setShowRadiusMenu(false); haptic("selection"); }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${
                      radius === r ? "font-semibold text-primary" : "text-foreground"
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="ml-auto text-[11px] text-muted-foreground font-medium">
            {filtered.length}{" "}
            {filtered.length === 1 ? tr("shops.results_count_one") : tr("shops.results_count_other")}
          </span>
        )}
      </div>

      {/* Content */}
      {viewMode === "map" ? (
        <div className="flex-1 min-h-[400px] relative">
          <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[400px] bg-muted"><Store className="h-8 w-8 animate-pulse text-muted-foreground" /></div>}>
            <InlineShopsMapView
              shops={feed.map((f: any) => f.item)}
              radiusKm={radius}
              onOpenShop={(slug: string) => navigate(`/s/${slug}`)}
            />
          </Suspense>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2.5 max-w-2xl mx-auto flex-1 overflow-y-auto">
          {isLoading && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </>
          )}

          {!isLoading && feed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Store className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">{tr("shops.no_public_shops")}</p>
              <p className="text-xs text-muted-foreground mt-1">{tr("shops.no_public_shops_desc")}</p>
            </div>
          )}

          {feed.map(({ item: shop, sponsored }: any, idx: number) => (
            <motion.button
              key={shop.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              onClick={() => { haptic("light"); navigate(`/s/${shop.slug}`); }}
              className="w-full rounded-3xl border border-border/50 bg-card p-4 text-left shadow-sm transition-transform duration-150 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3.5">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-1 ring-border/20" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{shop.name}</p>
                    {sponsored && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                        {tr("shops.sponsored")}
                      </span>
                    )}
                  </div>
                  {shop.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{shop.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {shop.city && <span className="text-[10px] text-muted-foreground">{shop.city}</span>}
                    {shop.vertical && (
                      <span className="text-[10px] text-muted-foreground capitalize bg-muted/50 px-1.5 py-0.5 rounded-full">{shop.vertical}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Bundle exports ── */

export default function V7BundleRoutes() {
  return (
    <>
      <Routes>
        <Route path="/shops" element={<ShopsPage />} />
        <Route path="/business" element={<MyBusinessHub />} />
        <Route path="/business/my-shops" element={<MyShopsPage />} />
      </Routes>
      <MobileBottomNav />
    </>
  );
}
