/**
 * OrbitHome — Premium super-app home.
 * Food-first · Luxury · Clean vertical hierarchy · No clutter
 */
import { useMemo, useCallback } from "react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";
import MarketplaceSection from "@/components/marketplace/MarketplaceSection";
import { useWalletBalance } from "@/payments/wallet-hooks";
import { runDigitalOrchestration } from "@/lib/engines/digital-orchestration-engine";
import {
  ChevronRight, MapPin,
  Search, Bell,
  MessageCircle, CreditCard, QrCode, Phone,
  UtensilsCrossed, Building2, Plane, Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

/* ═══════════════════════════════════════════════
   FOOD HERO BANNERS — time-aware, food-first
   ═══════════════════════════════════════════════ */
function useFoodBanners() {
  const h = new Date().getHours();
  return useMemo(() => {
    if (h >= 5 && h < 11) return {
      greeting: "Good morning",
      emoji: "☀️",
      headline: "Breakfast & brunch",
      sub: "Fresh pastries, coffee & healthy bowls delivered",
      gradient: "linear-gradient(135deg, hsl(35 85% 52%), hsl(20 90% 48%))",
    };
    if (h >= 11 && h < 15) return {
      greeting: "Bon appétit",
      emoji: "🍽️",
      headline: "Lunch specials",
      sub: "Top restaurants, express delivery",
      gradient: "linear-gradient(135deg, hsl(152 55% 42%), hsl(170 50% 38%))",
    };
    if (h >= 15 && h < 19) return {
      greeting: "Afternoon cravings",
      emoji: "☕",
      headline: "Coffee & snacks",
      sub: "Café, desserts & light bites",
      gradient: "linear-gradient(135deg, hsl(280 45% 50%), hsl(260 50% 44%))",
    };
    return {
      greeting: "Tonight's dinner",
      emoji: "🌙",
      headline: "Dinner delivered",
      sub: "Your favorites are ready to order",
      gradient: "linear-gradient(135deg, hsl(225 55% 32%), hsl(240 50% 26%))",
    };
  }, [h]);
}

/* ═══════════════════════════════════════════════
   QUICK ACTIONS — chat, call, pay, scan
   ═══════════════════════════════════════════════ */
const QUICK_ACTIONS = [
  { key: "chat", icon: MessageCircle, label: "Chat", path: "/orbit", color: "hsl(210 80% 52%)" },
  { key: "call", icon: Phone, label: "Call", path: "/orbit", color: "hsl(152 55% 42%)" },
  { key: "pay", icon: CreditCard, label: "Pay", path: "/wallet/hub", color: "hsl(38 65% 50%)" },
  { key: "scan", icon: QrCode, label: "Scan", path: "/pay/scan", color: "hsl(280 55% 52%)" },
] as const;

/* ═══════════════════════════════════════════════
   VERTICAL CARDS — food, travel, services
   ═══════════════════════════════════════════════ */
const VERTICALS = [
  {
    key: "food",
    icon: UtensilsCrossed,
    title: "Food",
    sub: "Restaurants & delivery",
    path: "/food",
    gradient: "linear-gradient(135deg, hsl(16 85% 55%), hsl(30 80% 50%))",
    accent: "hsl(16 85% 55%)",
  },
  {
    key: "travel",
    icon: Plane,
    title: "Travel",
    sub: "Trips & experiences",
    path: "/travel",
    gradient: "linear-gradient(135deg, hsl(196 75% 48%), hsl(210 70% 45%))",
    accent: "hsl(196 75% 48%)",
  },
  {
    key: "services",
    icon: Building2,
    title: "Services",
    sub: "Home, beauty & more",
    path: "/services-hub",
    gradient: "linear-gradient(135deg, hsl(260 50% 52%), hsl(280 45% 48%))",
    accent: "hsl(260 50% 52%)",
  },
] as const;

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
export default function OrbitHome() {
  const navigate = useNavigate();
  const go = useCallback((p: string) => navigate(p), [navigate]);
  const banner = useFoodBanners();
  const { balance, currency, loading: wLoading } = useWalletBalance();
  const orchestration = useMemo(() => runDigitalOrchestration(), []);
  const marqueeItems = useMemo(() => {
    const bannerItems = orchestration.activeBanners.map((item) => ({ label: item.title, path: "/food" }));
    const searchItems = orchestration.searchSuggestions.map((item) => ({ label: item, path: "/food" }));
    const verticalItems = orchestration.promotedVerticals.map((item) => ({
      label: item[0].toUpperCase() + item.slice(1),
      path: item === "food" ? "/food" : item === "services" ? "/services-hub" : item === "property" ? "/browse/real_estate" : "/travel",
    }));
    return [...bannerItems, ...searchItems, ...verticalItems].slice(0, 12);
  }, [orchestration]);

  /* Featured food — reads from storefront_pages (published truth) */
  const { data: featured = [] } = useQuery({
    queryKey: ["home-featured-food"],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_pages")
        .select("id, name, slug, banner_url, logo_url, subcategory, city, rating, region")
        .eq("vertical", "food")
        .order("display_priority", { ascending: false })
        .limit(8);
      q = governStorefrontQuery(q, "home");
      const { data } = await q;
      return (data || []).map((r: any) => ({
        id: r.id, name: r.name, image: r.banner_url || r.logo_url,
        category: `${r.subcategory || "Restaurant"} · ${r.region || r.city || ""}`, rating: Number(r.rating || 0),
        eta: "", badge: "Featured",
      }));
    },
    staleTime: 120_000,
  });

  /* Nearby food — reads from storefront_pages (published truth) */
  const { data: nearby = [] } = useQuery({
    queryKey: ["home-nearby-food"],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_pages")
        .select("id, name, slug, banner_url, logo_url, subcategory, city, rating, region")
        .eq("vertical", "food")
        .order("ranking_score", { ascending: false })
        .limit(10);
      q = governStorefrontQuery(q, "home");
      const { data } = await q;
      return (data || []).map((r: any) => ({
        id: r.id, name: r.name, image: r.banner_url || r.logo_url,
        category: `${r.subcategory || "Restaurant"} · ${r.region || r.city || ""}`, rating: Number(r.rating || 0),
        eta: "",
      }));
    },
    staleTime: 120_000,
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background" data-marketplace-home>
      <SEOHead
        title="Easy-Locs® — Food, Travel, Services & More"
        description="Order food, book trips, manage properties — all in one premium super app."
      />

      {/* ━━━ STICKY HEADER ━━━ */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: "hsl(var(--background) / 0.97)",
          borderBottom: "1px solid hsl(var(--border) / 0.06)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-2.5 max-w-md mx-auto">
          <button onClick={() => go("/settings/addresses")} className="flex items-center gap-2 active:opacity-70 min-w-0 flex-1">
            <MapPin className="w-4 h-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground leading-none">Delivering to</p>
              <p className="text-[13px] font-bold text-foreground leading-tight truncate">Dubai, UAE</p>
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => go("/search-results")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-muted">
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => go("/notifications")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform bg-muted">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* ━━━ MAIN SCROLL ━━━ */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
        <div className="pt-4 pb-8 space-y-7 max-w-md mx-auto">

          {/* ─── 1. FOOD HERO BANNER ─── */}
          <div className="px-5">
            <motion.button
              onClick={() => go("/food")}
              className="w-full rounded-3xl p-5 text-left relative overflow-hidden active:scale-[0.98] transition-transform"
              style={{ background: banner.gradient, minHeight: 150 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Decorative circles */}
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="absolute -right-2 bottom-0 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />

              <p className="text-white/70 text-xs font-semibold tracking-wide uppercase">{banner.greeting}</p>
              <h2 className="text-2xl font-extrabold text-white mt-1 font-serif">{banner.emoji} {banner.headline}</h2>
              <p className="text-white/80 text-[13px] mt-1.5 max-w-[80%]">{banner.sub}</p>

              <span className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-2xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                Order now <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </motion.button>
          </div>

          {marqueeItems.length > 0 && (
            <div className="overflow-hidden">
              <motion.div
                className="flex gap-2 w-max px-5"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              >
                {[...marqueeItems, ...marqueeItems].map((item, index) => (
                  <button
                    key={`${item.label}-${index}`}
                    onClick={() => go(item.path)}
                    className="shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold active:scale-95 transition-transform bg-card text-foreground"
                    style={{ border: "1px solid hsl(var(--border) / 0.08)" }}
                  >
                    {item.label}
                  </button>
                ))}
              </motion.div>
            </div>
          )}

          {/* ─── 2. QUICK ACTIONS ─── */}
          <div className="px-5">
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => go(a.path)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-[0.95] transition-transform bg-card"
                  style={{ border: "1px solid hsl(var(--border) / 0.08)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${a.color.replace(")", " / 0.1)")}` }}
                  >
                    <a.icon className="w-5 h-5" style={{ color: a.color }} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ─── 3. TRENDING FOOD — horizontal scroll ─── */}
          {featured.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
              <MarketplaceSection title="🔥 Trending now" seeAllPath="/food" items={featured} variant="horizontal-scroll" />
            </motion.div>
          )}

          {/* ─── 4. FAST DELIVERY — horizontal scroll ─── */}
          {nearby.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              <MarketplaceSection title="⚡ Express delivery" seeAllPath="/food" items={nearby.slice(0, 6)} variant="horizontal-scroll" />
            </motion.div>
          )}

          {/* ─── 5. VERTICALS — 3-column luxury cards ─── */}
          <div className="px-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground tracking-tight">Explore</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {VERTICALS.map((v) => (
                <motion.button
                  key={v.key}
                  onClick={() => go(v.path)}
                  className="rounded-2xl p-3.5 text-left active:scale-[0.96] transition-transform relative overflow-hidden"
                  style={{ background: v.gradient, minHeight: 110 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <v.icon className="w-5 h-5 text-white/90 mb-2" />
                  <p className="text-sm font-bold text-white leading-tight">{v.title}</p>
                  <p className="text-[10px] text-white/65 mt-0.5 leading-tight">{v.sub}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ─── 6. WALLET CARD ─── */}
          <div className="px-5">
            <button
              onClick={() => go("/wallet/hub")}
              className="w-full rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform bg-card"
              style={{ border: "1px solid hsl(var(--border) / 0.08)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-base font-black text-foreground tabular-nums">
                    {wLoading ? "···" : <><AnimatedCounter value={balance} decimals={2} duration={800} /> {currency}</>}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">Wallet balance</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
            </button>
          </div>

          {/* ─── 7. NEAR YOU — list view ─── */}
          {nearby.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
              <MarketplaceSection title="📍 Near you" seeAllPath="/food" items={nearby} variant="list" />
            </motion.div>
          )}

          {/* ─── 8. SELLER CTA ─── */}
          <div className="px-5">
            <motion.button
              onClick={() => go("/seller")}
              className="w-full rounded-2xl p-5 text-center active:scale-[0.98] transition-transform"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--accent) / 0.03))",
                border: "1px solid hsl(var(--primary) / 0.1)",
              }}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Sparkles className="w-7 h-7 mx-auto mb-2 text-primary" />
              <p className="text-[15px] font-bold text-foreground font-serif">Start your business</p>
              <p className="text-[11px] text-muted-foreground mt-1">5 min setup · 0% commission · Instant payments</p>
              <span
                className="inline-block mt-3 px-5 py-2 rounded-xl text-xs font-bold text-primary-foreground"
                style={{ background: "hsl(var(--primary))" }}
              >
                Create your shop
              </span>
            </motion.button>
          </div>

        </div>
      </div>
    </div>
  );
}
