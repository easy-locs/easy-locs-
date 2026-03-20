/**
 * OrbitHome — Careem-style super app home.
 * Top menu strip → Dynamic banners → Categories → Marketplace feed
 */
import { useMemo, memo, useCallback } from "react";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MarketplaceSection from "@/components/marketplace/MarketplaceSection";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import {
  ChevronRight, MapPin, Car, Building2,
  Plane, UtensilsCrossed, Search, Bell, Map, Rocket,
  MessageCircle, CreditCard, QrCode, Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { useState, useEffect } from "react";

/* ── Categories ── */
const CATEGORIES = [
  { id: "food", icon: "🍕", label: "Food", path: "/food" },
  { id: "grocery", icon: "🛒", label: "Grocery", path: "/grocery" },
  { id: "shops", icon: "🛍️", label: "Shops", path: "/shops" },
  { id: "services", icon: "🔧", label: "Services", path: "/services-hub" },
  { id: "ride", icon: "🚗", label: "Ride", path: "/ride" },
  { id: "send", icon: "📦", label: "Send", path: "/send" },
  { id: "property", icon: "🏠", label: "Property", path: "/real-estate" },
  { id: "travel", icon: "✈️", label: "Travel", path: "/travel" },
] as const;

/* ── Dynamic banners ── */
function useDynamicBanners() {
  const h = new Date().getHours();
  return useMemo(() => {
    const banners: Array<{ id: string; bg: string; title: string; sub: string; cta: string; path: string }> = [];

    if (h >= 5 && h < 11) {
      banners.push({
        id: "breakfast", bg: "linear-gradient(135deg, hsl(30 90% 55%), hsl(15 80% 50%))",
        title: "☀️ Good morning!", sub: "Breakfast deals near you", cta: "Order now", path: "/food",
      });
    } else if (h >= 11 && h < 15) {
      banners.push({
        id: "lunch", bg: "linear-gradient(135deg, hsl(142 60% 45%), hsl(160 50% 40%))",
        title: "🍽️ Lunch time!", sub: "Fast delivery from top restaurants", cta: "See restaurants", path: "/food",
      });
    } else if (h >= 15 && h < 18) {
      banners.push({
        id: "snack", bg: "linear-gradient(135deg, hsl(270 50% 55%), hsl(290 45% 50%))",
        title: "☕ Afternoon break", sub: "Coffee, snacks & desserts", cta: "Explore", path: "/food",
      });
    } else {
      banners.push({
        id: "dinner", bg: "linear-gradient(135deg, hsl(220 60% 35%), hsl(240 50% 30%))",
        title: "🌙 Dinner tonight", sub: "Your favorites are open", cta: "Order dinner", path: "/food",
      });
    }

    banners.push({
      id: "seller", bg: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
      title: "🚀 Launch your shop", sub: "Free · 0% commission · 5 min setup", cta: "Start now", path: "/seller",
    });
    banners.push({
      id: "property", bg: "linear-gradient(135deg, hsl(210 70% 50%), hsl(200 60% 45%))",
      title: "🏠 Find your home", sub: "Rent, buy or short stay", cta: "Browse", path: "/real-estate",
    });

    return banners;
  }, [h]);
}

/* ── Orbit actions ── */
const ORBIT_ACTIONS = [
  { key: "chat", icon: MessageCircle, label: "Chat", path: "/orbit", color: "hsl(210 80% 52%)" },
  { key: "call", icon: Phone, label: "Call", path: "/orbit", color: "hsl(142 60% 45%)" },
  { key: "pay", icon: CreditCard, label: "Pay", path: "/wallet/hub", color: "hsl(38 65% 50%)" },
  { key: "scan", icon: QrCode, label: "Scan", path: "/pay/scan", color: "hsl(270 60% 55%)" },
];

/* ── Category item ── */
const CategoryBubble = memo(function CategoryBubble({ cat, onNav }: { cat: typeof CATEGORIES[number]; onNav: (p: string) => void }) {
  return (
    <button
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
    </button>
  );
});

/* ── Banner carousel ── */
function BannerCarousel({ banners, onNav }: { banners: ReturnType<typeof useDynamicBanners>; onNav: (p: string) => void }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const b = banners[idx];

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.button
          key={b.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          onClick={() => onNav(b.path)}
          className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
          style={{ background: b.bg, minHeight: 120 }}
        >
          <p className="text-lg font-bold text-white">{b.title}</p>
          <p className="text-xs text-white/80 mt-0.5">{b.sub}</p>
          <span className="inline-block mt-3 px-4 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
            {b.cta}
          </span>
        </motion.button>
      </AnimatePresence>

      {/* Dots */}
      {banners.length > 1 && (
        <div className="flex gap-1.5 justify-center mt-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                background: i === idx ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrbitHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleNav = useCallback((path: string) => navigate(path), [navigate]);
  useDinoPageAudit({ actorType: user ? "user" : "anonymous", actorId: user?.id, pageKey: "home" });

  const banners = useDynamicBanners();

  const { data: featured = [] } = useQuery({
    queryKey: ["home-featured-seed"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("category", "food")
        .eq("is_featured", true)
        .order("visibility_score", { ascending: false })
        .limit(8);
      return (data || []).map((r: any) => ({
        id: r.id, name: r.name, image: r.cover_image,
        category: `${r.subcategory} · ${r.area}`, rating: Number(r.rating),
        eta: `${r.delivery_time_min}–${r.delivery_time_max} min`, badge: "Featured",
      }));
    },
    staleTime: 120_000,
  });

  const { data: nearby = [] } = useQuery({
    queryKey: ["home-nearby-seed"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("category", "food")
        .eq("is_open", true)
        .order("visibility_score", { ascending: false })
        .limit(10);
      return (data || []).map((r: any) => ({
        id: r.id, name: r.name, image: r.cover_image,
        category: `${r.subcategory} · ${r.area}`, rating: Number(r.rating),
        eta: `${r.delivery_time_min}–${r.delivery_time_max} min`,
      }));
    },
    staleTime: 120_000,
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background" data-marketplace-home>
      <SEOHead
        title="Easy-Locs® — Food, Ride, Property, Shops & Services"
        description="Order food, book rides, manage properties, shop locally — all in one super app. 190+ countries, 0% commission."
      />

      {/* ─── TOP MENU STRIP (Careem-style) ─── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: "hsl(var(--background) / 0.96)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid hsl(var(--border) / 0.06)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-2 max-w-md mx-auto">
          {/* Location */}
          <button onClick={() => handleNav("/settings/addresses")} className="flex items-center gap-2 active:opacity-70 min-w-0 flex-1">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Delivering to</p>
              <p className="text-[13px] font-bold text-foreground leading-tight truncate">Dubai, UAE</p>
            </div>
          </button>

          {/* Search + Bell */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => handleNav("/search-results")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--muted))" }}>
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => handleNav("/notifications")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--muted))" }}>
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
        <div className="pt-3 pb-6 space-y-5 max-w-md mx-auto">

          {/* ─── DYNAMIC BANNER CAROUSEL ─── */}
          <div className="px-4">
            <BannerCarousel banners={banners} onNav={handleNav} />
          </div>

          {/* ─── ORBIT QUICK ACTIONS (aligned grid) ─── */}
          <div className="px-4">
            <div className="grid grid-cols-4 gap-2">
              {ORBIT_ACTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleNav(a.path)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-[0.95] transition-transform"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${a.color.replace(")", " / 0.12)")}` }}
                  >
                    <a.icon className="w-5 h-5" style={{ color: a.color }} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ─── CATEGORIES GRID ─── */}
          <div className="px-4">
            <div className="grid grid-cols-4 gap-y-3 gap-x-2">
              {CATEGORIES.map((cat) => (
                <CategoryBubble key={cat.id} cat={cat} onNav={handleNav} />
              ))}
            </div>
          </div>

          {/* ─── TRENDING ─── */}
          {featured.length > 0 && (
            <MarketplaceSection title="🔥 Trending" seeAllPath="/food" items={featured} variant="horizontal-scroll" />
          )}

          {/* ─── FAST DELIVERY ─── */}
          {nearby.length > 0 && (
            <MarketplaceSection title="⚡ Fast delivery" seeAllPath="/food" items={nearby.slice(0, 6)} variant="horizontal-scroll" />
          )}

          {/* ─── WALLET PREVIEW ─── */}
          <div className="px-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Wallet</h2>
              <button onClick={() => handleNav("/wallet/hub")} className="text-xs font-semibold flex items-center gap-0.5 active:opacity-70" style={{ color: "hsl(var(--primary))" }}>
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <OrbitWalletCard />
          </div>

          {/* ─── MAP PREVIEW ─── */}
          <div className="px-4">
            <button
              onClick={() => handleNav("/map")}
              className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(210 80% 52% / 0.1)" }}>
                <Map className="w-5 h-5" style={{ color: "hsl(210 80% 52%)" }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-foreground">Explorer Map</p>
                <p className="text-[11px] text-muted-foreground">All shops, services & properties nearby</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </button>
          </div>

          {/* ─── NEAR YOU LIST ─── */}
          {nearby.length > 0 && (
            <MarketplaceSection title="📍 Near you" seeAllPath="/food" items={nearby} variant="list" />
          )}

          {/* ─── EXPLORE SERVICES ─── */}
          <div className="px-4 space-y-2">
            <h2 className="text-sm font-bold text-foreground">Explore services</h2>
            <div className="space-y-2">
              {[
                { icon: UtensilsCrossed, title: "Food & Restaurants", sub: "Order from nearby restaurants", path: "/food", color: "hsl(16 85% 55%)" },
                { icon: Building2, title: "Property & Rentals", sub: "Find your next home", path: "/real-estate", color: "hsl(210 70% 55%)" },
                { icon: Plane, title: "Travel & Activities", sub: "Book trips and experiences", path: "/travel", color: "hsl(196 80% 50%)" },
                { icon: Car, title: "Ride & Transport", sub: "Cars, bikes & more", path: "/ride", color: "hsl(145 60% 42%)" },
              ].map((svc) => (
                <button key={svc.path} onClick={() => handleNav(svc.path)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${svc.color.replace(")", " / 0.12)")}` }}>
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

          {/* ─── SELLER CTA ─── */}
          <div className="px-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl p-5 text-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--accent) / 0.04))",
                border: "1px solid hsl(var(--primary) / 0.12)",
              }}
            >
              <Rocket className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--primary))" }} />
              <p className="text-base font-bold text-foreground">Start your business today</p>
              <p className="text-xs text-muted-foreground mt-1">5 min setup · Zero commission · Instant payments</p>
              <button
                onClick={() => handleNav("/seller")}
                className="mt-3 px-6 py-2.5 rounded-xl text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform"
                style={{ background: "hsl(var(--primary))" }}
              >
                Create your shop
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
