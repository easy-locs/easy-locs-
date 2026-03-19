/**
 * OrbitHome — Careem-style super app hub.
 * Map hero + service grid + promo banners + vertical marketplace feed.
 * Each vertical = mini app experience.
 */
import { useEffect, useMemo, memo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useI18n } from "@/lib/i18n";
import { trackMount } from "@/lib/orbit-perf";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import {
  ChevronRight, MessageCircle, MapPin, Car, Building2, Star, Send,
  Plane, UtensilsCrossed, ShoppingBag, Package, Wrench, ShoppingCart,
  Search, Bell, Bike, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSmartHomeFeed } from "@/hooks/useSmartHomeFeed";
import type { UserSignals, ShopSignal } from "@/lib/home/home-ranking";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";

import promoBanner1 from "@/assets/promo-banner-1.png";
import promoBanner2 from "@/assets/promo-banner-2.png";

/* ═══ Service Categories ═══ */
const SERVICES = [
  { id: "food", icon: UtensilsCrossed, label: "Food", path: "/food", color: "hsl(16 85% 55%)", bg: "hsl(16 85% 55% / 0.12)" },
  { id: "shops", icon: ShoppingBag, label: "Shops", path: "/shops", color: "hsl(262 60% 58%)", bg: "hsl(262 60% 58% / 0.12)" },
  { id: "property", icon: Building2, label: "Property", path: "/real-estate", color: "hsl(210 70% 55%)", bg: "hsl(210 70% 55% / 0.12)" },
  { id: "ride", icon: Car, label: "Ride", path: "/ride", color: "hsl(145 60% 42%)", bg: "hsl(145 60% 42% / 0.12)" },
  { id: "send", icon: Package, label: "Send", path: "/send", color: "hsl(38 80% 50%)", bg: "hsl(38 80% 50% / 0.12)" },
  { id: "travel", icon: Plane, label: "Travel", path: "/travel", color: "hsl(196 80% 50%)", bg: "hsl(196 80% 50% / 0.12)" },
  { id: "grocery", icon: ShoppingCart, label: "Grocery", path: "/grocery", color: "hsl(120 50% 45%)", bg: "hsl(120 50% 45% / 0.12)" },
  { id: "services", icon: Wrench, label: "Services", path: "/services-hub", color: "hsl(340 65% 55%)", bg: "hsl(340 65% 55% / 0.12)" },
] as const;

const PROMOS = [
  { id: "promo1", image: promoBanner1, title: "Ramadan Special", subtitle: "Up to 30% off on all services", cta: "Explore", path: "/explore" },
  { id: "promo2", image: promoBanner2, title: "Food Delivery", subtitle: "Free delivery on first order", cta: "Order now", path: "/food" },
];

/* ═══ Service Grid Item ═══ */
const ServiceTile = memo(function ServiceTile({ service, index, onNavigate }: {
  service: typeof SERVICES[number]; index: number; onNavigate: (path: string) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => onNavigate(service.path)}
      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-[0.93] transition-all"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
        style={{ background: service.bg }}
      >
        <service.icon className="w-5.5 h-5.5" style={{ color: service.color }} />
      </div>
      <span className="text-[11px] font-semibold text-foreground">{service.label}</span>
    </motion.button>
  );
});

/* ═══ Promo Banner Carousel ═══ */
const PromoBannerCarousel = memo(function PromoBannerCarousel({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % PROMOS.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.button
            key={PROMOS[current].id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            onClick={() => onNavigate(PROMOS[current].path)}
            className="w-full relative aspect-[2.3/1] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
          >
            <img
              src={PROMOS[current].image}
              alt={PROMOS[current].title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Overlay text */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-base font-black text-white drop-shadow-lg">{PROMOS[current].title}</h3>
              <p className="text-xs text-white/80 mt-0.5">{PROMOS[current].subtitle}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs font-bold text-primary">{PROMOS[current].cta}</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
          </motion.button>
        </AnimatePresence>
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-2.5">
        {PROMOS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/20"}`}
          />
        ))}
      </div>
    </div>
  );
});

/* ═══ Quick Access Section ═══ */
const QuickAccessCard = memo(function QuickAccessCard({ icon: Icon, title, subtitle, path, color, onNavigate }: {
  icon: React.ElementType; title: string; subtitle: string; path: string; color: string; onNavigate: (path: string) => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onNavigate(path)}
      className="flex items-center gap-3 p-3 rounded-2xl border border-border/10 bg-card/60 active:bg-card transition-colors"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color.replace(")", " / 0.12)")}` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
    </motion.button>
  );
});

/* ═══ Section header ═══ */
const SectionHeader = memo(function SectionHeader({ title, action, onAction }: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {action && (
        <button onClick={onAction} className="text-xs font-semibold text-primary flex items-center gap-0.5 active:opacity-70">
          {action}<ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

/* ═══ Shop card for carousels ═══ */
const ShopCard = memo(function ShopCard({ shop, onClick }: { shop: ShopSignal; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="flex flex-col min-w-[140px] max-w-[140px] rounded-2xl overflow-hidden border border-border/10 bg-card/60"
    >
      <div className="w-full h-[80px] bg-muted/30 flex items-center justify-center overflow-hidden">
        {shop.photo_url ? (
          <img src={shop.photo_url} alt={shop.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-2xl">🏪</span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-bold text-foreground truncate">{shop.title}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-[10px] text-muted-foreground">{shop.rating.toFixed(1)}</span>
        </div>
      </div>
    </motion.button>
  );
});

/* ═══ Orbit Mini-Hub ═══ */
const OrbitMiniHub = memo(function OrbitMiniHub({ unreadCount, onNavigate }: {
  unreadCount: number; onNavigate: (path: string) => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onNavigate("/dashboard/communication")}
      className="flex items-center gap-3 p-3 rounded-2xl border border-border/10 bg-card/60 w-full"
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--hud-cyan) / 0.15)" }}>
        <MessageCircle className="w-5 h-5" style={{ color: "hsl(var(--hud-cyan))" }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-foreground">Orbit Messages</p>
        <p className="text-[10px] text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "All caught up"}
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
    </motion.button>
  );
});

/* ═══ Main Component ═══ */
export default function OrbitHome() {
  const mountStart = useMemo(() => performance.now(), []);
  const { user, orgId } = useAuth();
  const engine = useOrbitEngine();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => { trackMount("OrbitHome", mountStart); }, [mountStart]);
  useEffect(() => {
    if (!user?.id) return;
    engine.refresh(user.id, orgId || undefined);
  }, [user?.id, orgId]);

  const handleNavigate = useCallback((path: string) => navigate(path), [navigate]);

  // Fetch conversations for unread count
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
    [conversations]
  );

  // Fetch shops
  const { data: dbShops } = useQuery({
    queryKey: ["home-shops"],
    queryFn: async () => {
      const { data } = await supabase
        .from("storefront_pages" as any)
        .select("id, name, vertical, city, logo_url, latitude, longitude, rating, slug, subcategory")
        .eq("active", true)
        .limit(20);
      return (data || []).map((s: any) => ({
        id: s.id, title: s.name || "Shop", category: s.vertical || "shop",
        lat: s.latitude, lng: s.longitude, orderCount7d: 0, revenue7d: 0,
        conversionRate: 0, rating: s.rating ?? 4.2, photo_url: s.logo_url,
        city: s.city, slug: s.slug,
      })) as ShopSignal[];
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

  return (
    <div className="flex flex-col min-h-full bg-background">
      <SEOHead title="Easy-Locs" description="Your super app — Food, Ride, Property, Shops & more." />

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-sm font-black text-primary-foreground">E</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-foreground leading-tight">Easy-Locs</p>
              <p className="text-[10px] text-muted-foreground leading-tight flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" /> Dubai, UAE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigate("/explore")}
              className="w-9 h-9 rounded-xl bg-card border border-border/15 flex items-center justify-center active:scale-90 transition-transform"
            >
              <Search className="w-4.5 h-4.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleNavigate("/admin/alerts")}
              className="w-9 h-9 rounded-xl bg-card border border-border/15 flex items-center justify-center active:scale-90 transition-transform relative"
            >
              <Bell className="w-4.5 h-4.5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-destructive text-[8px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto pb-[calc(70px+env(safe-area-inset-bottom,0px))]">
        <div className="px-4 pt-4 pb-6 space-y-5 max-w-md mx-auto">

          {/* 1. Service Grid — 4x2 */}
          <div className="grid grid-cols-4 gap-1">
            {SERVICES.map((svc, i) => (
              <ServiceTile key={svc.id} service={svc} index={i} onNavigate={handleNavigate} />
            ))}
          </div>

          {/* 2. Promo Banners */}
          <PromoBannerCarousel onNavigate={handleNavigate} />

          {/* 3. Orbit Mini Hub */}
          <OrbitMiniHub unreadCount={unreadCount} onNavigate={handleNavigate} />

          {/* 4. Quick Actions Row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Car, label: "Book Ride", path: "/ride", color: "hsl(145 60% 42%)" },
              { icon: Send, label: "Send", path: "/send", color: "hsl(38 80% 50%)" },
              { icon: MapPin, label: "Nearby", path: "/super-map", color: "hsl(196 80% 50%)" },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNavigate(item.path)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-border/10 bg-card/60"
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
                <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
              </motion.button>
            ))}
          </div>

          {/* 5. Wallet Card */}
          <div>
            <SectionHeader title="Wallet" action="See all" onAction={() => handleNavigate("/wallet/hub")} />
            <div className="mt-2">
              <OrbitWalletCard />
            </div>
          </div>

          {/* 6. Trending Shops */}
          {trending.length > 0 && (
            <div>
              <SectionHeader title="Trending near you" action="See all" onAction={() => handleNavigate("/explore")} />
              <div className="flex gap-2.5 overflow-x-auto pb-1 mt-2 scrollbar-hide -mx-1 px-1">
                {trending.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} onClick={() => handleNavigate(`/food/restaurant/${shop.slug || shop.id}`)} />
                ))}
              </div>
            </div>
          )}

          {/* 7. Nearby Top */}
          {nearbyTop.length > 0 && (
            <div>
              <SectionHeader title="Nearby shops" action="Map" onAction={() => handleNavigate("/super-map")} />
              <div className="flex gap-2.5 overflow-x-auto pb-1 mt-2 scrollbar-hide -mx-1 px-1">
                {nearbyTop.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} onClick={() => handleNavigate(`/food/restaurant/${shop.slug || shop.id}`)} />
                ))}
              </div>
            </div>
          )}

          {/* 8. Service Verticals — Full cards */}
          <div className="space-y-2.5">
            <SectionHeader title="Explore services" />
            <QuickAccessCard
              icon={UtensilsCrossed} title="Food & Restaurants"
              subtitle="Order from nearby restaurants, fast delivery"
              path="/food" color="hsl(16 85% 55%)" onNavigate={handleNavigate}
            />
            <QuickAccessCard
              icon={Building2} title="Property & Rentals"
              subtitle="Find your next home or manage properties"
              path="/real-estate" color="hsl(210 70% 55%)" onNavigate={handleNavigate}
            />
            <QuickAccessCard
              icon={Plane} title="Travel & Activities"
              subtitle="Book trips, activities and experiences"
              path="/travel" color="hsl(196 80% 50%)" onNavigate={handleNavigate}
            />
            <QuickAccessCard
              icon={Bike} title="Ride & Transport"
              subtitle="Cars, bikes, scheduled & intercity rides"
              path="/ride" color="hsl(145 60% 42%)" onNavigate={handleNavigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
