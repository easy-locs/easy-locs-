/**
 * DiscoverPage — V7 Premium Local Commerce Homepage.
 * Revenue-first, locally intelligent, conversion-driven.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import {
  TrendingUp, MapPin, Star, Sparkles, Store, Package, Briefcase,
  Loader2, ChevronRight, Zap, Clock, Utensils, Shirt,
  Cpu, Scissors, Home, Wrench, ArrowRight, Flame, Pizza,
  Truck, BadgePercent, ShoppingBag, Crown, Rocket,
} from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import GlobalSearch from "@/components/storefront/GlobalSearch";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";
import UniversalActionButtons from "@/components/actions/UniversalActionButtons";

/* ══════════════════════════════════════
   CONFIGURATION
   ══════════════════════════════════════ */

const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles, color: "text-accent" },
  { id: "food", label: "Food & Drinks", icon: Utensils, color: "text-orange-500" },
  { id: "services", label: "Services", icon: Wrench, color: "text-sky-500" },
  { id: "fashion", label: "Fashion", icon: Shirt, color: "text-pink-500" },
  { id: "tech", label: "Tech", icon: Cpu, color: "text-blue-500" },
  { id: "beauty", label: "Beauty", icon: Scissors, color: "text-purple-500" },
  { id: "home", label: "Home", icon: Home, color: "text-emerald-500" },
];

const HERO_BANNERS = [
  {
    id: "pizza",
    badge: "🍕 Fast Delivery",
    title: "Pizza & Food Near You",
    subtitle: "Order from top-rated local restaurants. Delivered fast.",
    cta: "Order Now",
    path: "/discover?rail=nearby&v=food",
    gradient: "from-orange-600 via-red-500 to-rose-600",
    icon: Pizza,
  },
  {
    id: "deals",
    badge: "🔥 Limited Time",
    title: "Today's Best Deals",
    subtitle: "Up to 50% off at trending shops near you.",
    cta: "See Deals",
    path: "/discover?rail=trending",
    gradient: "from-accent via-amber-500 to-orange-500",
    icon: BadgePercent,
  },
  {
    id: "top",
    badge: "⭐ Community Choice",
    title: "Top Rated Shops",
    subtitle: "Highest-rated businesses loved by locals.",
    cta: "Explore Top Rated",
    path: "/discover?rail=top_rated",
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    icon: Crown,
  },
  {
    id: "sell",
    badge: "🚀 Start Free",
    title: "Sell on ORBIT",
    subtitle: "Create your shop in minutes. Reach thousands of local buyers.",
    cta: "Start Selling",
    path: "/business",
    gradient: "from-primary via-blue-600 to-cyan-500",
    icon: Rocket,
  },
];

const RAILS = [
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "nearby", label: "Nearby", icon: MapPin },
  { id: "top_rated", label: "Top Rated", icon: Star },
  { id: "smart_picks", label: "For You", icon: Sparkles },
] as const;

type RailId = typeof RAILS[number]["id"];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

/* ══════════════════════════════════════
   HERO BANNER CAROUSEL
   ══════════════════════════════════════ */
function HeroBannerCarousel({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % HERO_BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const b = HERO_BANNERS[active];
  const Icon = b.icon;

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.button
          key={b.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={() => { haptic("light"); onNavigate(b.path); }}
          className={`w-full rounded-3xl bg-gradient-to-br ${b.gradient} p-5 pb-6 text-left relative overflow-hidden`}
        >
          {/* Ambient orbs */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-15 blur-3xl" style={{ background: "white" }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: "white" }} />

          <div className="relative z-10">
            {/* Badge */}
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/80 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 mb-3">
              {b.badge}
            </span>

            {/* Title */}
            <h2 className="text-xl font-extrabold text-white leading-tight">{b.title}</h2>
            <p className="text-[12px] text-white/75 mt-1.5 leading-relaxed max-w-[85%]">{b.subtitle}</p>

            {/* CTA */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-card px-5 py-2.5 shadow-lg">
              <span className="text-[12px] font-extrabold text-foreground">{b.cta}</span>
              <ArrowRight className="h-3.5 w-3.5 text-foreground" />
            </div>
          </div>

          {/* Faded icon */}
          <Icon className="absolute bottom-3 right-4 h-16 w-16 text-white/[0.07]" strokeWidth={1} />
        </motion.button>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {HERO_BANNERS.map((_, i) => (
          <button key={i} onClick={() => { setActive(i); haptic("selection"); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-7 bg-accent" : "w-1.5 bg-muted-foreground/20"
            }`} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   SPONSORED PREMIUM SLOT
   ══════════════════════════════════════ */
function SponsoredSlot({ variant }: { variant: "banner" | "card" }) {
  const navigate = useNavigate();

  if (variant === "banner") {
    return (
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => { haptic("light"); navigate("/business"); }}
        className="w-full rounded-2xl relative overflow-hidden text-left"
        style={{
          background: "linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--primary) / 0.08))",
          border: "1px solid hsl(var(--accent) / 0.15)",
        }}
      >
        <div className="p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--accent) / 0.2), hsl(var(--accent) / 0.05))" }}>
            <Zap className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground">Boost Your Business</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Get featured • Reach local buyers • Increase sales</p>
          </div>
          <div className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-[11px] font-bold text-accent-foreground">
            Promote
          </div>
        </div>
        <span className="absolute top-2 right-2.5 text-[7px] font-semibold text-muted-foreground/40 uppercase tracking-widest">Ad</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => { haptic("light"); navigate("/business"); }}
      className="w-full rounded-2xl border border-accent/10 bg-card p-4 text-left relative overflow-hidden"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Crown className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">Featured Merchant Spot</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Promote your shop to thousands</p>
        </div>
        <ChevronRight className="h-4 w-4 text-accent shrink-0" />
      </div>
      <span className="absolute top-1.5 right-2 text-[7px] font-semibold text-muted-foreground/40 uppercase tracking-widest">Sponsored</span>
    </motion.button>
  );
}

/* ══════════════════════════════════════
   SMART LOCAL SECTION (horizontal scroll)
   ══════════════════════════════════════ */
function SmartLocalSection({ icon: Icon, title, shops, onShopClick, emptyText }: {
  icon: any; title: string; shops: any[]; onShopClick: (slug: string) => void; emptyText?: string;
}) {
  if (!shops || shops.length === 0) {
    if (!emptyText) return null;
    return (
      <div>
        <SectionHeader icon={Icon} title={title} />
        <p className="text-xs text-muted-foreground text-center py-4">{emptyText}</p>
      </div>
    );
  }
  return (
    <div>
      <SectionHeader icon={Icon} title={title} count={shops.length} />
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4">
        {shops.slice(0, 10).map((shop: any, i: number) => (
          <motion.button
            key={shop.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => { haptic("light"); onShopClick(shop.slug); }}
            className="shrink-0 w-[140px] rounded-2xl border border-border/30 bg-card overflow-hidden text-left transition-all active:scale-[0.96]"
          >
            {shop.banner_url ? (
              <div className="h-20 bg-muted"><img src={shop.banner_url} alt="" className="w-full h-full object-cover" loading="lazy" /></div>
            ) : (
              <div className="h-20 bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                <Store className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
            <div className="p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="h-3 w-3 text-primary" />
                  </div>
                )}
                <p className="text-[11px] font-bold text-foreground truncate">{shop.name}</p>
              </div>
              {shop.city && <p className="text-[9px] text-muted-foreground truncate">{shop.city}</p>}
              <div className="flex items-center gap-1 mt-1">
                {shop.avg_rating > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-accent">
                    <Star className="h-2 w-2 fill-current" /> {Number(shop.avg_rating).toFixed(1)}
                  </span>
                )}
                {shop.boost_tier && (
                  <span className="text-[8px] font-bold text-accent"><Zap className="h-2 w-2 inline" /></span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   SHOP CARD (Grid)
   ══════════════════════════════════════ */
function ShopCard({ shop, index, rail, onClick }: { shop: any; index: number; rail?: string; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025 }}
      className="w-full rounded-2xl border border-border/30 bg-card overflow-hidden text-left transition-all duration-150"
    >
      <button
        onClick={() => { haptic("light"); onClick(); }}
        className="w-full text-left active:scale-[0.97] transition-transform"
      >
        {shop.banner_url && (
          <div className="h-20 bg-muted overflow-hidden">
            <img src={shop.banner_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-border/20" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-foreground truncate">{shop.name}</p>
              {shop.city && <p className="text-[10px] text-muted-foreground truncate">{shop.city}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {shop.vertical && (
              <span className="text-[8px] font-semibold bg-primary/8 text-primary px-2 py-0.5 rounded-full">{shop.vertical}</span>
            )}
            {shop.avg_rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-amber-500">
                <Star className="h-2.5 w-2.5 fill-current" /> {Number(shop.avg_rating).toFixed(1)}
              </span>
            )}
            {shop.boost_tier && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-accent">
                <Zap className="h-2.5 w-2.5" /> Featured
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="px-3 pb-3">
        <UniversalActionButtons
          entityType="shop"
          entityId={shop.id}
          slug={shop.slug}
          title={shop.name}
          recipientId={shop.user_id}
          recipientName={shop.name}
          compact
          primaryOnly
          metadata={{ source: "discover" }}
        />
      </div>
    </motion.div>
  );
}

/* ── Product Card ── */
function ProductCard({ item, onClick }: { item: any; onClick: () => void }) {
  const photo = item.photo_url || (Array.isArray(item.photo_urls) && item.photo_urls[0]);
  const shopData = item.storefront_pages;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full rounded-2xl border border-border/30 bg-card overflow-hidden text-left transition-all duration-150"
    >
      <button
        onClick={() => { haptic("light"); onClick(); }}
        className="w-full text-left active:scale-[0.97] transition-transform"
      >
        {photo && (
          <div className="aspect-square bg-muted overflow-hidden">
            <img src={photo} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-extrabold text-primary">{fmtPrice(item.price, item.currency)}</span>
            {item.compare_at_price && item.compare_at_price > item.price && (
              <span className="text-[9px] text-muted-foreground line-through">{fmtPrice(item.compare_at_price, item.currency)}</span>
            )}
          </div>
          {shopData?.name && <p className="text-[9px] text-muted-foreground truncate">{shopData.name}</p>}
        </div>
      </button>
      <div className="px-2.5 pb-2.5">
        <UniversalActionButtons
          entityType="product"
          entityId={item.id}
          title={item.title}
          amount={item.price}
          currency={item.currency}
          recipientId={shopData?.user_id}
          recipientName={shopData?.name}
          compact
          primaryOnly
          context={{ isPurchasable: (item.price ?? 0) > 0 }}
          metadata={{ source: "discover", shopSlug: shopData?.slug }}
        />
      </div>
    </motion.div>
  );
}

/* ── Section Header ── */
function SectionHeader({ icon: Icon, title, count, onSeeAll }: { icon: any; title: string; count?: number; onSeeAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3 w-3 text-primary" />
        </div>
        <h2 className="text-[13px] font-bold text-foreground">{title}</h2>
        {count != null && count > 0 && (
          <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {onSeeAll && (
        <button onClick={() => { haptic("light"); onSeeAll(); }}
          className="text-[11px] font-semibold text-accent flex items-center gap-0.5 active:opacity-70">
          See all <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════ */
export default function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = searchParams.get("q") || "";
  const activeRail = (searchParams.get("rail") as RailId) || null;
  const [vertical, setVertical] = useState(searchParams.get("v") || "all");
  const geo = useGeolocation();
  const hasGeo = geo.lat != null && geo.lng != null;

  /* ── Main shops query ── */
  const { data: shops = [], isLoading: shopsLoading } = useQuery({
    queryKey: ["discover-shops", vertical, query, activeRail, hasGeo ? `${geo.lat},${geo.lng}` : "no-geo", user?.id],
    queryFn: async () => {
      if (query.trim()) {
        if (hasGeo) {
          const { data } = await supabase.rpc("search_nearby_shops" as any, {
            _lat: geo.lat!, _lng: geo.lng!, _radius_km: 100,
            _query: query.trim(), _vertical: vertical, _limit: 50,
          });
          return data || [];
        }
        let q = (supabase as any).from("storefront_pages").select("*")
          .eq("shop_visibility", "public")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
          .limit(50);
        if (vertical !== "all") q = q.eq("vertical", vertical);
        const { data } = await q;
        return data || [];
      }

      if (activeRail === "trending") {
        const { data } = await supabase.rpc("get_trending_shops" as any, { _limit: 30 });
        let r = data || [];
        if (vertical !== "all") r = r.filter((s: any) => s.vertical === vertical);
        return r;
      }
      if (activeRail === "top_rated") {
        const { data } = await supabase.rpc("get_top_rated_shops" as any, { _limit: 30 });
        let r = data || [];
        if (vertical !== "all") r = r.filter((s: any) => s.vertical === vertical);
        return r;
      }
      if (activeRail === "smart_picks" && user) {
        const { data } = await supabase.rpc("get_smart_picks" as any, { _user_id: user.id, _limit: 30 });
        let r = data || [];
        if (vertical !== "all") r = r.filter((s: any) => s.vertical === vertical);
        return r;
      }
      if (activeRail === "nearby" && hasGeo) {
        const { data } = await supabase.rpc("search_nearby_shops" as any, {
          _lat: geo.lat!, _lng: geo.lng!, _radius_km: 50,
          _query: "", _vertical: vertical, _limit: 30,
        });
        return data || [];
      }

      let q = (supabase as any).from("storefront_pages").select("*")
        .eq("shop_visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);
      if (vertical !== "all") q = q.eq("vertical", vertical);
      const { data } = await q;
      return data || [];
    },
  });

  /* ── Products ── */
  const { data: products = [] } = useQuery({
    queryKey: ["discover-products", vertical, query],
    queryFn: async () => {
      let q = (supabase as any).from("catalog_items")
        .select("*, storefront_pages!catalog_items_shop_id_fkey(name, slug, shop_visibility)")
        .eq("available", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (query.trim()) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      const { data } = await q;
      return (data || []).filter((item: any) => item.storefront_pages?.shop_visibility === "public");
    },
    enabled: !activeRail,
  });

  const isHome = !activeRail && !query.trim();

  /* ── Smart local sections derived from main shops data ── */
  const foodShops = useMemo(() => shops.filter((s: any) => s.vertical?.toLowerCase() === "food"), [shops]);
  const topRatedShops = useMemo(() => [...shops].filter((s: any) => s.avg_rating > 0).sort((a: any, b: any) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 10), [shops]);
  const popularShops = useMemo(() => [...shops].sort((a: any, b: any) => (b.order_count || 0) - (a.order_count || 0)).slice(0, 10), [shops]);

  const railLabel = activeRail
    ? RAILS.find(r => r.id === activeRail)?.label || "Discover"
    : query ? `Results for "${query}"` : "Featured Shops";

  return (
    <>
      <SEOHead title="Discover | ORBIT" description="Explore shops, products and services near you" />
      <div className="min-h-screen bg-background pb-24">

        {/* ═══ STICKY HEADER ═══ */}
        <div className="sticky top-0 z-30" style={{
          background: "hsl(var(--background) / 0.92)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          borderBottom: "1px solid hsl(var(--border) / 0.25)",
        }}>
          <div className="px-4 pt-3 pb-3 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h1 className="text-lg font-extrabold text-foreground leading-none">Discover</h1>
                <p className="text-[10px] text-muted-foreground mt-0.5">Local shops, food & services</p>
              </div>
              {hasGeo && (
                <span className="inline-flex items-center gap-1 text-[9px] font-medium text-accent bg-accent/10 rounded-full px-2 py-1">
                  <MapPin className="h-2.5 w-2.5" /> Near you
                </span>
              )}
            </div>
            <GlobalSearch />
          </div>
        </div>

        <div className="px-4 max-w-lg mx-auto space-y-5 pt-4">

          {/* ═══ HERO BANNERS ═══ */}
          {isHome && <HeroBannerCarousel onNavigate={navigate} />}

          {/* ═══ CATEGORIES ═══ */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = vertical === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setVertical(cat.id); haptic("selection"); }}
                  className={`shrink-0 flex items-center gap-2 rounded-2xl px-4 py-2.5 border transition-all duration-150 active:scale-[0.96] ${
                    isActive
                      ? "bg-primary/10 border-primary/20"
                      : "bg-card border-border/30"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : cat.color}`} />
                  <span className={`text-[11px] font-semibold whitespace-nowrap ${isActive ? "text-primary" : "text-foreground"}`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ═══ DISCOVERY RAILS ═══ */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
            {RAILS.map(r => {
              const isActive = activeRail === r.id;
              const disabled = (r.id === "nearby" && !hasGeo) || (r.id === "smart_picks" && !user);
              return (
                <button key={r.id}
                  onClick={() => {
                    if (disabled) return;
                    haptic("light");
                    navigate(isActive ? "/discover" : `/discover?rail=${r.id}`);
                  }}
                  disabled={disabled}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-150 ${
                    isActive
                      ? "bg-accent text-accent-foreground border-accent"
                      : disabled
                        ? "bg-muted/15 text-muted-foreground/30 border-border/20 cursor-not-allowed"
                        : "bg-card border-border/30 text-foreground active:scale-[0.97]"
                  }`}>
                  <r.icon className="h-3 w-3" /> {r.label}
                </button>
              );
            })}
          </div>

          {/* ═══ SPONSORED BANNER ═══ */}
          {isHome && <SponsoredSlot variant="banner" />}

          {/* ═══ SMART LOCAL SECTIONS (Home only) ═══ */}
          {isHome && !shopsLoading && (
            <>
              {/* 🍕 Food Near You */}
              <SmartLocalSection
                icon={Pizza}
                title="🍕 Food & Delivery Near You"
                shops={foodShops}
                onShopClick={(slug) => navigate(`/s/${slug}`)}
              />

              {/* ⭐ Top Rated */}
              {topRatedShops.length > 0 && (
                <SmartLocalSection
                  icon={Star}
                  title="⭐ Top Rated"
                  shops={topRatedShops}
                  onShopClick={(slug) => navigate(`/s/${slug}`)}
                />
              )}

              {/* Sponsored card slot */}
              <SponsoredSlot variant="card" />

              {/* 🔥 Popular Now — fallback for "For You" */}
              {popularShops.length > 0 && (
                <SmartLocalSection
                  icon={Flame}
                  title="🔥 Popular Now"
                  shops={popularShops}
                  onShopClick={(slug) => navigate(`/s/${slug}`)}
                />
              )}
            </>
          )}

          {/* ═══ MAIN SHOPS GRID ═══ */}
          <div>
            <SectionHeader
              icon={activeRail ? (RAILS.find(r => r.id === activeRail)?.icon || Store) : Store}
              title={railLabel}
              count={shops.length}
              onSeeAll={activeRail ? undefined : () => navigate("/shops")}
            />

            {shopsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-2xl bg-muted/20 animate-pulse" style={{ height: 130 }} />
                ))}
              </div>
            ) : shops.length === 0 ? (
              <div className="rounded-2xl border border-border/20 bg-card p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-muted/40 flex items-center justify-center mb-3">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {activeRail === "nearby" && !hasGeo ? "Enable location to discover nearby" :
                   activeRail === "smart_picks" && !user ? "Sign in for personalized picks" :
                   "No shops found"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Try a different category or filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {shops.slice(0, 8).map((shop: any, i: number) => (
                  <ShopCard key={shop.id} shop={shop} index={i} rail={activeRail || undefined}
                    onClick={() => navigate(`/s/${shop.slug}`)} />
                ))}
              </div>
            )}

            {shops.length > 8 && (
              <button onClick={() => { haptic("light"); navigate("/shops"); }}
                className="w-full mt-3 rounded-xl border border-border/30 bg-card py-3 text-[11px] font-bold text-accent flex items-center justify-center gap-1 active:scale-[0.98] transition-transform">
                View all shops <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* ═══ PRODUCTS ═══ */}
          {!activeRail && products.length > 0 && (
            <div>
              <SectionHeader
                icon={Package}
                title={query ? `Products matching "${query}"` : "Latest Products"}
                count={products.length}
              />
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 6).map((item: any) => {
                  const shopData = item.storefront_pages;
                  return (
                    <ProductCard key={item.id} item={item}
                      onClick={() => shopData?.slug ? navigate(`/s/${shopData.slug}`) : undefined} />
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ MERCHANT CTA ═══ */}
          {isHome && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => { haptic("light"); navigate("/business"); }}
              className="w-full rounded-2xl p-5 text-left relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--accent) / 0.04))",
                border: "1px solid hsl(var(--primary) / 0.08)",
              }}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-foreground">Start selling today</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Create your shop free • Reach local buyers</p>
                </div>
                <div className="shrink-0 rounded-xl bg-primary px-4 py-2 text-[11px] font-bold text-primary-foreground">
                  Start
                </div>
              </div>
            </motion.button>
          )}
        </div>
      </div>
    </>
  );
}
