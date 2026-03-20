/**
 * OrbitHome — Premium super app home with hero, search, categories,
 * marketplace highlights, wallet preview, map preview, seller CTA.
 */
import { useEffect, useMemo, memo, useState, useCallback, useRef } from "react";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MarketplaceSection from "@/components/marketplace/MarketplaceSection";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import {
  ChevronRight, MapPin, Car, Building2,
  Plane, UtensilsCrossed, ShoppingCart, Wrench,
  Search, Bell, Send, Map, Rocket, Zap, Star,
  MessageCircle, CreditCard, QrCode, Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

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

/* ── Time-based meal suggestion ── */
function getMealContext() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return { label: "☀️ Breakfast", emoji: "🥐", filter: "breakfast" };
  if (h >= 11 && h < 15) return { label: "🍽️ Lunch", emoji: "🥗", filter: "lunch" };
  if (h >= 15 && h < 18) return { label: "☕ Snacks", emoji: "🧋", filter: "snacks" };
  return { label: "🌙 Dinner", emoji: "🍜", filter: "dinner" };
}

/* ── Orbit quick actions ── */
const ORBIT_ACTIONS = [
  { key: "chat", icon: MessageCircle, label: "Chat", path: "/orbit", color: "hsl(210 80% 52%)" },
  { key: "call", icon: Phone, label: "Call", path: "/orbit", color: "hsl(142 60% 45%)" },
  { key: "pay", icon: CreditCard, label: "Pay", path: "/wallet/hub", color: "hsl(38 65% 50%)" },
  { key: "scan", icon: QrCode, label: "Scan QR", path: "/pay/scan", color: "hsl(270 60% 55%)" },
];

/* ── Category Bubble ── */
const CategoryBubble = memo(function CategoryBubble({ cat, index, onNav }: { cat: typeof CATEGORIES[number]; index: number; onNav: (p: string) => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onNav(cat.path)}
      className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
        <span className="text-2xl">{cat.icon}</span>
      </div>
      <span className="text-[11px] font-semibold text-foreground leading-tight">{cat.label}</span>
    </motion.button>
  );
});

export default function OrbitHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleNav = useCallback((path: string) => navigate(path), [navigate]);
  useDinoPageAudit({ actorType: user ? "user" : "anonymous", actorId: user?.id, pageKey: "home" });

  const meal = useMemo(() => getMealContext(), []);

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

      {/* Sticky Header */}
      <header className="sticky top-0 z-40" style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(16px)", borderBottom: "1px solid hsl(var(--border) / 0.08)" }}>
        <div className="flex items-center justify-between px-4 py-2.5 max-w-md mx-auto">
          <button onClick={() => handleNav("/settings/addresses")} className="flex items-center gap-1.5 active:opacity-70 min-w-0">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-foreground leading-tight truncate">Dubai, UAE</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Al Barsha 1 · Change</p>
            </div>
          </button>
          <button onClick={() => handleNav("/notifications")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--muted))" }}>
            <Bell className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 max-w-md mx-auto">
          <button data-search data-primary-cta onClick={() => handleNav("/search-results")} className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--muted))" }}>
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search anything…</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
        <div className="pt-4 pb-6 space-y-6 max-w-md mx-auto">

          {/* Hero mini banner */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 rounded-2xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.06))",
              border: "1px solid hsl(var(--primary) / 0.1)",
            }}
          >
            <div className="p-4">
              <p className="text-xs font-bold text-primary">Easy-Locs®</p>
              <p className="text-base font-bold text-foreground mt-0.5">Launch your shop in 5 minutes</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Free · 0% commission · Instant payments</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleNav("/seller")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground active:scale-[0.97] transition-transform"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  Start your business
                </button>
                <button
                  onClick={() => handleNav("/explore")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold active:scale-[0.97] transition-transform"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                >
                  Explore
                </button>
              </div>
            </div>
          </motion.div>

          {/* Orbit Quick Actions */}
          <div className="px-4">
            <div className="flex justify-between gap-2">
              {ORBIT_ACTIONS.map((a, i) => (
                <motion.button
                  key={a.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  onClick={() => handleNav(a.path)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-[0.95] transition-transform"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${a.color.replace(")", " / 0.12)")}` }}
                  >
                    <a.icon className="w-5 h-5" style={{ color: a.color }} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground">{a.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-4 gap-y-3 gap-x-2 px-4">
            {CATEGORIES.map((cat, i) => (
              <CategoryBubble key={cat.id} cat={cat} index={i} onNav={handleNav} />
            ))}
          </div>

          {/* Time-based suggestion */}
          <div className="px-4">
            <button
              onClick={() => handleNav("/food")}
              className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, hsl(15 80% 55% / 0.08), hsl(38 80% 55% / 0.06))", border: "1px solid hsl(15 80% 55% / 0.1)" }}
            >
              <span className="text-3xl">{meal.emoji}</span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-foreground">{meal.label}</p>
                <p className="text-[11px] text-muted-foreground">Popular picks near you right now</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </button>
          </div>

          {/* Trending */}
          {featured.length > 0 && (
            <MarketplaceSection title="🔥 Trending near you" seeAllPath="/food" items={featured} variant="horizontal-scroll" />
          )}

          {/* Fast delivery */}
          {nearby.length > 0 && (
            <MarketplaceSection title="⚡ Fast delivery" seeAllPath="/food" items={nearby.slice(0, 6)} variant="horizontal-scroll" />
          )}

          {/* Wallet Preview */}
          <div className="px-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Wallet</h2>
              <button onClick={() => handleNav("/wallet/hub")} className="text-xs font-semibold flex items-center gap-0.5 active:opacity-70" style={{ color: "hsl(var(--primary))" }}>
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <OrbitWalletCard />
          </div>

          {/* Map Preview */}
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
                <p className="text-[11px] text-muted-foreground">View all shops, services & properties nearby</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </button>
          </div>

          {/* Near you list */}
          {nearby.length > 0 && (
            <MarketplaceSection title="📍 Near you" seeAllPath="/food" items={nearby} variant="list" />
          )}

          {/* Explore services */}
          <div className="px-4 space-y-2">
            <h2 className="text-sm font-bold text-foreground">Explore services</h2>
            <div className="space-y-2">
              {[
                { icon: UtensilsCrossed, title: "Food & Restaurants", sub: "Order from nearby restaurants", path: "/food", color: "hsl(16 85% 55%)" },
                { icon: Building2, title: "Property & Rentals", sub: "Find your next home", path: "/real-estate", color: "hsl(210 70% 55%)" },
                { icon: Plane, title: "Travel & Activities", sub: "Book trips and experiences", path: "/travel", color: "hsl(196 80% 50%)" },
                { icon: Car, title: "Ride & Transport", sub: "Cars, bikes & more", path: "/ride", color: "hsl(145 60% 42%)" },
              ].map((svc) => (
                <button key={svc.path} onClick={() => handleNav(svc.path)} data-card="listing" className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}>
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

          {/* Seller CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-4 rounded-2xl p-5 text-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--accent) / 0.04))",
              border: "1px solid hsl(var(--primary) / 0.12)",
            }}
          >
            <Rocket className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--primary))" }} />
            <p className="text-base font-bold text-foreground">Start your business today</p>
            <p className="text-xs text-muted-foreground mt-1">5 minutes setup · Zero commission · Instant payments</p>
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
  );
}
