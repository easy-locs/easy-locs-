/**
 * OrbitHome — Careem-style super app hub.
 * Location bar + search + service grid + promo + marketplace sections.
 */
import { useEffect, useMemo, memo, useState, useCallback, useRef } from "react";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useI18n } from "@/lib/i18n";
import { trackMount } from "@/lib/orbit-perf";
import { useGodModeSnapshot } from "@/hooks/useGodModeSnapshot";
import GodModeInsightsBar from "@/components/orbit/GodModeInsightsBar";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import MarketplaceSection from "@/components/marketplace/MarketplaceSection";
import {
  ChevronRight, MapPin, Car, Building2, Star, Send,
  Plane, UtensilsCrossed, ShoppingBag, Package, Wrench, ShoppingCart,
  Search, Bell, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSmartHomeFeed } from "@/hooks/useSmartHomeFeed";
import type { UserSignals, ShopSignal } from "@/lib/home/home-ranking";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";

import promoBanner1 from "@/assets/promo-banner-1.png";
import promoBanner2 from "@/assets/promo-banner-2.png";

/* ═══ Categories ═══ */
const CATEGORIES = [
  { id: "food", icon: "🍕", label: "Food", path: "/food" },
  { id: "grocery", icon: "🛒", label: "Grocery", path: "/grocery" },
  { id: "shops", icon: "🛍️", label: "Shops", path: "/shops" },
  { id: "ride", icon: "🚗", label: "Ride", path: "/ride" },
  { id: "send", icon: "📦", label: "Send", path: "/send" },
  { id: "property", icon: "🏠", label: "Property", path: "/real-estate" },
  { id: "services", icon: "🔧", label: "Services", path: "/services-hub" },
  { id: "travel", icon: "✈️", label: "Travel", path: "/travel" },
] as const;

const PROMOS = [
  { id: "promo1", image: promoBanner1, title: "Ramadan Special", subtitle: "Up to 30% off on all services", cta: "Explore", path: "/explore" },
  { id: "promo2", image: promoBanner2, title: "Free Delivery", subtitle: "On your first food order", cta: "Order now", path: "/food" },
];

/* ═══ Category Bubble ═══ */
const CategoryBubble = memo(function CategoryBubble({ cat, index, onNav }: {
  cat: typeof CATEGORIES[number]; index: number; onNav: (p: string) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onNav(cat.path)}
      className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "hsl(var(--muted))" }}
      >
        <span className="text-2xl">{cat.icon}</span>
      </div>
      <span className="text-[11px] font-semibold text-foreground leading-tight">{cat.label}</span>
    </motion.button>
  );
});

/* ═══ Promo Banner ═══ */
const PromoBanner = memo(function PromoBanner({ onNav }: { onNav: (p: string) => void }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % PROMOS.length), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="px-4">
      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.button
            key={PROMOS[current].id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            onClick={() => onNav(PROMOS[current].path)}
            className="w-full relative aspect-[2.2/1] overflow-hidden active:scale-[0.98] transition-transform"
          >
            <img src={PROMOS[current].image} alt={PROMOS[current].title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-base font-black text-white drop-shadow-lg">{PROMOS[current].title}</h3>
              <p className="text-xs text-white/80 mt-0.5">{PROMOS[current].subtitle}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs font-bold" style={{ color: "hsl(var(--accent))" }}>{PROMOS[current].cta}</span>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
              </div>
            </div>
          </motion.button>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {PROMOS.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? "w-5" : "w-1.5"}`}
            style={{ background: i === current ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)" }}
          />
        ))}
      </div>
    </div>
  );
});

/* ═══ Main Component ═══ */
export default function OrbitHome() {
  const mountStart = useMemo(() => performance.now(), []);
  const { user, orgId } = useAuth();
  const engine = useOrbitEngine();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: godSnapshot } = useGodModeSnapshot(user?.id);

  useEffect(() => { trackMount("OrbitHome", mountStart); }, [mountStart]);
  useDinoPageAudit({ actorType: user ? "user" : "anonymous", actorId: user?.id, pageKey: "home" });
  useEffect(() => {
    if (!user?.id) return;
    engine.refresh(user.id, orgId || undefined);
  }, [user?.id, orgId]);

  const handleNav = useCallback((path: string) => navigate(path), [navigate]);

  // Fetch shops
  const { data: dbShops } = useQuery({
    queryKey: ["home-shops"],
    queryFn: async () => {
      const { data } = await supabase
        .from("storefront_pages" as any)
        .select("id, name, vertical, city, logo_url, cover_url, latitude, longitude, rating, slug, subcategory")
        .eq("active", true)
        .limit(30);
      return (data || []).map((s: any) => ({
        id: s.id, title: s.name || "Shop", category: s.vertical || "shop",
        lat: s.latitude, lng: s.longitude, orderCount7d: 0, revenue7d: 0,
        conversionRate: 0, rating: s.rating ?? 4.2, photo_url: s.cover_url || s.logo_url,
        city: s.city, slug: s.slug, subcategory: s.subcategory,
      })) as (ShopSignal & { subcategory?: string })[];
    },
    staleTime: 120_000,
  });

  const userSignals = useMemo<UserSignals>(() => ({
    userId: user?.id || "", lat: null, lng: null,
    recentCategories: [], recentSearches: [],
    recentOrdersCount: 0, recentRideCount: 0,
    recentWalletActions: 0, recentRealEstateActions: 0, merchantMode: false,
  }), [user?.id]);

  const shops = dbShops || [];
  const { nearbyTop, trending } = useSmartHomeFeed(userSignals, shops);

  // Convert ShopSignal to MerchantItem format
  const toItems = (list: ShopSignal[]) => list.map(s => ({
    id: s.id, name: s.title, image: s.photo_url, category: (s as any).subcategory || s.category,
    rating: s.rating, eta: "15–30 min", slug: (s as any).slug,
  }));

  // Conversations unread count
  const { data: conversations } = useQuery({
    queryKey: ["home-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("conversation_threads" as any)
        .select("id, unread_count")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .limit(20);
      return (data || []) as any[];
    },
    staleTime: 30_000,
    enabled: !!user?.id,
  });
  const unreadCount = useMemo(() =>
    (conversations || []).reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0),
  [conversations]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background" data-marketplace-home>
      <SEOHead title="Easy-Locs — Your Super App" description="Food, Ride, Property, Shops & more." />

      {/* ── Top Bar ── */}
      <header
        className="sticky top-0 z-40"
        style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(16px)", borderBottom: "1px solid hsl(var(--border) / 0.08)" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 max-w-md mx-auto">
          <button onClick={() => handleNav("/settings/addresses")} className="flex items-center gap-1.5 active:opacity-70 min-w-0">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground leading-tight truncate">Dubai, UAE</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Al Barsha 1 · Change</p>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleNav("/admin/alerts")}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform relative"
              style={{ background: "hsl(var(--muted))" }}
            >
              <Bell className="w-4.5 h-4.5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ background: "hsl(var(--destructive))", color: "white" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3 max-w-md mx-auto">
          <button
            data-search
            data-primary-cta
            onClick={() => handleNav("/explore")}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl active:scale-[0.98] transition-transform"
            style={{ background: "hsl(var(--muted))" }}
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search restaurants, shops, services…</span>
          </button>
        </div>
      </header>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
        <div className="pt-4 pb-6 space-y-6 max-w-md mx-auto">

          {/* 1. Category Bubbles — 4×2 */}
          <div className="grid grid-cols-4 gap-y-3 gap-x-2 px-4">
            {CATEGORIES.map((cat, i) => (
              <CategoryBubble key={cat.id} cat={cat} index={i} onNav={handleNav} />
            ))}
          </div>

          {/* God Mode Insights */}
          {godSnapshot && <div className="px-4"><GodModeInsightsBar snapshot={godSnapshot} /></div>}

          {/* 2. Promo Banner */}
          <PromoBanner onNav={handleNav} />

          {/* 3. Trending Near You */}
          {trending.length > 0 && (
            <MarketplaceSection
              title="🔥 Trending near you"
              seeAllPath="/explore"
              items={toItems(trending)}
              variant="horizontal-scroll"
            />
          )}

          {/* 4. Fast Delivery */}
          {nearbyTop.length > 0 && (
            <MarketplaceSection
              title="⚡ Fast delivery"
              seeAllPath="/food"
              items={toItems(nearbyTop.slice(0, 6))}
              variant="horizontal-scroll"
            />
          )}

          {/* 5. Wallet Preview */}
          <div className="px-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Wallet</h2>
              <button onClick={() => handleNav("/wallet/hub")}
                className="text-xs font-semibold flex items-center gap-0.5 active:opacity-70"
                style={{ color: "hsl(var(--primary))" }}
              >
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <OrbitWalletCard />
          </div>

          {/* 6. Nearby Shops */}
          {nearbyTop.length > 0 && (
            <MarketplaceSection
              title="📍 Near you"
              seeAllPath="/super-map"
              items={toItems(nearbyTop)}
              variant="list"
            />
          )}

          {/* 7. New on Platform */}
          {shops.length > 4 && (
            <MarketplaceSection
              title="✨ New on Easy-Locs"
              items={toItems(shops.slice(-4))}
              variant="grid"
            />
          )}

          {/* 8. Explore Services */}
          <div className="px-4 space-y-2">
            <h2 className="text-sm font-bold text-foreground">Explore services</h2>
            <div className="space-y-2">
              {[
                { icon: UtensilsCrossed, title: "Food & Restaurants", sub: "Order from nearby restaurants", path: "/food", color: "hsl(16 85% 55%)" },
                { icon: Building2, title: "Property & Rentals", sub: "Find your next home", path: "/real-estate", color: "hsl(210 70% 55%)" },
                { icon: Plane, title: "Travel & Activities", sub: "Book trips and experiences", path: "/travel", color: "hsl(196 80% 50%)" },
                { icon: Car, title: "Ride & Transport", sub: "Cars, bikes & more", path: "/ride", color: "hsl(145 60% 42%)" },
              ].map((svc) => (
                <button
                  key={svc.path}
                  onClick={() => handleNav(svc.path)}
                  data-card="listing"
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${svc.color.replace(")", " / 0.12)")}` }}>
                    <svc.icon className="w-5 h-5" style={{ color: svc.color }} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground">{svc.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{svc.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
