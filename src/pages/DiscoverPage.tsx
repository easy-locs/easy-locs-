/**
 * DiscoverPage — V7 Premium Marketplace Homepage.
 * Dynamic banners, smart categories, curated rails, sponsored slots.
 */
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, MapPin, Star, Sparkles, Store, Package, Briefcase,
  Loader2, Search, X, ChevronRight, Zap, Clock, Utensils, Shirt,
  Cpu, Scissors, Home, Wrench, ArrowRight,
} from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import GlobalSearch from "@/components/storefront/GlobalSearch";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

/* ─── Category config ─── */
const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles, gradient: "from-primary/20 to-accent/10" },
  { id: "food", label: "Food", icon: Utensils, gradient: "from-orange-500/20 to-amber-500/10" },
  { id: "fashion", label: "Fashion", icon: Shirt, gradient: "from-pink-500/20 to-rose-500/10" },
  { id: "tech", label: "Tech", icon: Cpu, gradient: "from-blue-500/20 to-cyan-500/10" },
  { id: "beauty", label: "Beauty", icon: Scissors, gradient: "from-purple-500/20 to-fuchsia-500/10" },
  { id: "home", label: "Home", icon: Home, gradient: "from-emerald-500/20 to-green-500/10" },
  { id: "services", label: "Services", icon: Wrench, gradient: "from-sky-500/20 to-indigo-500/10" },
];

/* ─── Promotional banners (future: from DB / CMS) ─── */
const PROMO_BANNERS = [
  {
    id: "1",
    title: "Flash Deals",
    subtitle: "Up to 50% off local restaurants",
    gradient: "from-accent via-amber-500 to-orange-500",
    icon: Zap,
    cta: "Explore Deals",
    path: "/discover?rail=trending",
  },
  {
    id: "2",
    title: "New Shops Near You",
    subtitle: "Discover fresh storefronts in your area",
    gradient: "from-primary via-blue-600 to-cyan-500",
    icon: MapPin,
    cta: "See Nearby",
    path: "/discover?rail=nearby",
  },
  {
    id: "3",
    title: "Top Rated",
    subtitle: "Community favorites with 4.5+ stars",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    icon: Star,
    cta: "Browse Top Rated",
    path: "/discover?rail=top_rated",
  },
];

const RAILS = [
  { id: "trending", label: "Trending", icon: TrendingUp, description: "Most popular right now" },
  { id: "nearby", label: "Nearby", icon: MapPin, description: "Close to you" },
  { id: "top_rated", label: "Top Rated", icon: Star, description: "Community favorites" },
  { id: "smart_picks", label: "For You", icon: Sparkles, description: "Personalized picks" },
] as const;

type RailId = typeof RAILS[number]["id"];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

/* ─── Hero Banner Carousel ─── */
function HeroBannerCarousel({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive(i => (i + 1) % PROMO_BANNERS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = PROMO_BANNERS[active];
  const Icon = banner.icon;

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.button
          key={banner.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35 }}
          onClick={() => { haptic("light"); onNavigate(banner.path); }}
          className={`w-full rounded-2xl bg-gradient-to-r ${banner.gradient} p-5 text-left relative overflow-hidden`}
          style={{ minHeight: 120 }}
        >
          {/* Ambient glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl"
            style={{ background: "radial-gradient(circle, white, transparent)" }} />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="h-4 w-4 text-white/90" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Featured</span>
              </div>
              <h2 className="text-lg font-extrabold text-white leading-tight">{banner.title}</h2>
              <p className="text-xs text-white/80 mt-1 leading-relaxed">{banner.subtitle}</p>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-[11px] font-bold text-white">
                {banner.cta} <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </motion.button>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {PROMO_BANNERS.map((_, i) => (
          <button key={i} onClick={() => { setActive(i); haptic("selection"); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-6 bg-accent" : "w-1.5 bg-muted-foreground/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Sponsored Banner Slot ─── */
function SponsoredSlot({ position }: { position: number }) {
  // Future: fetch from ad_events / boost_purchases table
  // For now, render a subtle placeholder that can be filled
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * position }}
      className="rounded-2xl border border-border/30 bg-gradient-to-r from-muted/40 to-muted/20 p-4 relative overflow-hidden"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Promote your business here</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Reach local customers • Boost visibility</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
      <span className="absolute top-1.5 right-2 text-[8px] font-medium text-muted-foreground/50 uppercase tracking-wider">Sponsored</span>
    </motion.div>
  );
}

/* ─── Shop Card (Premium) ─── */
function ShopCard({ shop, index, rail, onClick }: { shop: any; index: number; rail?: string; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={() => { haptic("light"); onClick(); }}
      className="w-full rounded-2xl border border-border/40 bg-card overflow-hidden text-left shadow-sm transition-all duration-150 active:scale-[0.97] hover:shadow-md"
    >
      {shop.banner_url && (
        <div className="h-24 bg-muted overflow-hidden">
          <img src={shop.banner_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-border/20" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="h-4.5 w-4.5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
            {shop.city && <p className="text-[11px] text-muted-foreground truncate">{shop.city}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {shop.vertical && (
            <span className="text-[9px] font-medium bg-primary/8 text-primary px-2 py-0.5 rounded-full">{shop.vertical}</span>
          )}
          {shop.avg_rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              <Star className="h-2.5 w-2.5 fill-current" /> {Number(shop.avg_rating).toFixed(1)}
            </span>
          )}
          {rail === "trending" && shop.order_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-2.5 w-2.5" /> {shop.order_count}
            </span>
          )}
          {shop.boost_tier && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-accent/15 text-accent px-2 py-0.5 rounded-full">
              <Zap className="h-2.5 w-2.5" /> Boosted
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ─── Product Card (Premium) ─── */
function ProductCard({ item, onClick }: { item: any; onClick: () => void }) {
  const photo = item.photo_url || (Array.isArray(item.photo_urls) && item.photo_urls[0]);
  const shopData = item.storefront_pages;
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => { haptic("light"); onClick(); }}
      className="w-full rounded-2xl border border-border/40 bg-card overflow-hidden text-left shadow-sm transition-all duration-150 active:scale-[0.97]"
    >
      {photo && (
        <div className="aspect-square bg-muted overflow-hidden">
          <img src={photo} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-2.5 space-y-1.5">
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-primary">{fmtPrice(item.price, item.currency)}</span>
          {item.compare_at_price && item.compare_at_price > item.price && (
            <span className="text-[10px] text-muted-foreground line-through">{fmtPrice(item.compare_at_price, item.currency)}</span>
          )}
        </div>
        {shopData?.name && (
          <p className="text-[10px] text-muted-foreground truncate">{shopData.name}</p>
        )}
      </div>
    </motion.button>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ icon: Icon, title, count, onSeeAll }: { icon: any; title: string; count?: number; onSeeAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {count != null && count > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {onSeeAll && (
        <button onClick={() => { haptic("light"); onSeeAll(); }}
          className="text-[11px] font-semibold text-accent flex items-center gap-0.5">
          See all <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN DISCOVER PAGE
   ════════════════════════════════════════ */
export default function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = searchParams.get("q") || "";
  const activeRail = (searchParams.get("rail") as RailId) || null;
  const [vertical, setVertical] = useState("all");
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
        let results = data || [];
        if (vertical !== "all") results = results.filter((s: any) => s.vertical === vertical);
        return results;
      }
      if (activeRail === "top_rated") {
        const { data } = await supabase.rpc("get_top_rated_shops" as any, { _limit: 30 });
        let results = data || [];
        if (vertical !== "all") results = results.filter((s: any) => s.vertical === vertical);
        return results;
      }
      if (activeRail === "smart_picks" && user) {
        const { data } = await supabase.rpc("get_smart_picks" as any, { _user_id: user.id, _limit: 30 });
        let results = data || [];
        if (vertical !== "all") results = results.filter((s: any) => s.vertical === vertical);
        return results;
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

  const isHomeFeed = !activeRail && !query.trim();
  const railLabel = activeRail
    ? RAILS.find(r => r.id === activeRail)?.label || "Discover"
    : query ? `Results for "${query}"` : "Featured Shops";

  return (
    <>
      <SEOHead title="Discover | ORBIT" description="Explore shops, products and services near you" />
      <div className="min-h-screen bg-background pb-24">

        {/* ═══ HEADER ═══ */}
        <div className="sticky top-0 z-30"
          style={{
            background: "hsl(var(--background) / 0.92)",
            backdropFilter: "blur(16px) saturate(140%)",
            WebkitBackdropFilter: "blur(16px) saturate(140%)",
            borderBottom: "1px solid hsl(var(--border) / 0.3)",
          }}
        >
          <div className="px-4 pt-3 pb-3 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div>
                <h1 className="text-xl font-extrabold text-foreground leading-none">Discover</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">Shops, products & services</p>
              </div>
            </div>
            <GlobalSearch />
          </div>
        </div>

        <div className="px-4 max-w-lg mx-auto space-y-5 pt-4">

          {/* ═══ HERO BANNERS ═══ */}
          {isHomeFeed && <HeroBannerCarousel onNavigate={navigate} />}

          {/* ═══ CATEGORIES ═══ */}
          <div>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = vertical === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setVertical(cat.id); haptic("selection"); }}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 transition-all duration-150 ${
                      isActive
                        ? "bg-primary/10 border border-primary/20 shadow-sm"
                        : "bg-card border border-border/30 hover:border-border/60"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-foreground/70"}`} />
                    </div>
                    <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ DISCOVERY RAILS ═══ */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
            {RAILS.map(r => {
              const isActive = activeRail === r.id;
              const disabled = r.id === "nearby" && !hasGeo;
              const disabledPicks = r.id === "smart_picks" && !user;
              return (
                <button key={r.id}
                  onClick={() => {
                    if (disabled || disabledPicks) return;
                    haptic("light");
                    navigate(isActive ? "/discover" : `/discover?rail=${r.id}`);
                  }}
                  disabled={disabled || disabledPicks}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-150 ${
                    isActive
                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                      : disabled || disabledPicks
                        ? "bg-muted/20 text-muted-foreground/40 border-border/30 cursor-not-allowed"
                        : "bg-card border-border/40 text-foreground hover:border-accent/30 active:scale-[0.97]"
                  }`}>
                  <r.icon className="h-3.5 w-3.5" /> {r.label}
                </button>
              );
            })}
          </div>

          {/* ═══ SPONSORED SLOT 1 ═══ */}
          {isHomeFeed && <SponsoredSlot position={1} />}

          {/* ═══ SHOPS SECTION ═══ */}
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
                  <div key={i} className="rounded-2xl bg-muted/30 animate-pulse" style={{ height: 140 }} />
                ))}
              </div>
            ) : shops.length === 0 ? (
              <div className="rounded-2xl border border-border/30 bg-card p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {activeRail === "nearby" && !hasGeo ? "Enable location to discover nearby" :
                   activeRail === "smart_picks" && !user ? "Sign in for personalized picks" :
                   "No shops found"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Try a different category or filter.</p>
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
                className="w-full mt-3 rounded-xl border border-border/40 bg-card py-3 text-xs font-semibold text-accent flex items-center justify-center gap-1 transition-all active:scale-[0.98]">
                View all shops <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* ═══ SPONSORED SLOT 2 ═══ */}
          {isHomeFeed && shops.length > 0 && <SponsoredSlot position={2} />}

          {/* ═══ PRODUCTS SECTION ═══ */}
          {!activeRail && products.length > 0 && (
            <div>
              <SectionHeader
                icon={Package}
                title={query ? `Products matching "${query}"` : "Latest Products"}
                count={products.length}
              />
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 8).map((item: any) => {
                  const shopData = item.storefront_pages;
                  return (
                    <ProductCard key={item.id} item={item}
                      onClick={() => shopData?.slug ? navigate(`/s/${shopData.slug}`) : undefined} />
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ QUICK ACTIONS / CTA ═══ */}
          {isHomeFeed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.05))",
                border: "1px solid hsl(var(--primary) / 0.1)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Start selling today</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Create your shop in minutes</p>
                </div>
                <button
                  onClick={() => { haptic("light"); navigate("/business"); }}
                  className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:scale-[0.95] transition-transform"
                >
                  Start
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
