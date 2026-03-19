/**
 * OrbitHome — Smart dynamic home with ranked blocks, video hero, and real DB data.
 * Orbit-first, then dynamically ordered marketplace/wallet/activity blocks.
 */
import { useEffect, useMemo, memo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useI18n } from "@/lib/i18n";
import { trackMount } from "@/lib/orbit-perf";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import { ChevronRight, MessageCircle, Phone, Wallet, ScanLine, MapPin, Car, Home as HomeIcon, Building2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSmartHomeFeed } from "@/hooks/useSmartHomeFeed";
import type { UserSignals, ShopSignal, RankedBlock } from "@/lib/home/home-ranking";

/* ═══ Video Hero ═══ */
const VideoHero = memo(function VideoHero() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="w-full max-w-md rounded-2xl overflow-hidden relative" style={{ aspectRatio: "16/7" }}>
      {/* Poster skeleton */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse" style={{ background: "hsl(var(--hud-surface-2))" }} />
      )}
      <video
        autoPlay muted loop playsInline
        preload="metadata"
        onLoadedData={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        poster="/placeholder.svg"
      >
        <source src="https://assets.mixkit.co/videos/preview/mixkit-city-traffic-on-a-bridge-at-night-4222-large.mp4" type="video/mp4" />
      </video>
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--hud-bg)) 0%, transparent 50%)" }} />
      <div className="absolute bottom-3 left-4 right-4">
        <p className="text-[13px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Easy-Locs</p>
        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>Your world, one tap away</p>
      </div>
    </div>
  );
});

/* ═══ Section header ═══ */
const SectionLabel = memo(function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsl(var(--hud-text-dim) / 0.55)" }}>{title}</h2>
      {action && (
        <button onClick={onAction} className="text-[10px] font-semibold flex items-center gap-0.5 active:opacity-70" style={{ color: "hsl(var(--hud-cyan))" }}>
          {action}<ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

/* ═══ Conversation row ═══ */
const ConversationRow = memo(function ConversationRow({ name, message, time, unread, onClick }: {
  name: string; message: string; time: string; unread?: number; onClick: () => void;
}) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["hsl(var(--hud-cyan) / 0.2)", "hsl(210 60% 25%)", "hsl(260 40% 25%)", "hsl(340 40% 25%)"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] min-h-[56px]">
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: bg, color: "hsl(var(--hud-text))" }}>{initials}</div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: "hsl(var(--hud-text))" }}>{name}</p>
        <p className="text-[11px] truncate leading-snug mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.55)" }}>{message}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
        <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{time}</span>
        {unread != null && unread > 0 && (
          <span className="min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1" style={{ background: "hsl(var(--hud-cyan))", color: "#fff" }}>{unread > 99 ? "99+" : unread}</span>
        )}
      </div>
    </button>
  );
});

/* ═══ Quick actions ═══ */
const QUICK_ACTIONS = [
  { icon: MessageCircle, label: "Message", path: "/dashboard/communication", color: "hsl(var(--hud-cyan))" },
  { icon: Phone, label: "Call", path: "/dashboard/communication?section=calls", color: "hsl(var(--hud-success))" },
  { icon: Wallet, label: "Pay", path: "/wallet/hub", color: "hsl(var(--hud-warning))" },
  { icon: ScanLine, label: "Scan", path: "/qr/entry/scan", color: "hsl(var(--hud-purple))" },
] as const;

/* ═══ Categories ═══ */
const CATEGORIES = [
  { icon: "🍽️", label: "Food", path: "/explore?cat=food" },
  { icon: "🛍️", label: "Shops", path: "/shops" },
  { icon: "🏠", label: "Property", path: "/real-estate" },
  { icon: "🚗", label: "Ride", path: "/ride" },
  { icon: "📦", label: "Delivery", path: "/send" },
  { icon: "✈️", label: "Travel", path: "/travel" },
] as const;

/* ═══ Shop card for carousels ═══ */
const ShopCard = memo(function ShopCard({ shop, onClick }: { shop: ShopSignal; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col min-w-[140px] max-w-[140px] rounded-xl overflow-hidden active:scale-[0.97] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
      <div className="w-full h-20 flex items-center justify-center" style={{ background: "hsl(var(--hud-surface-2))" }}>
        {shop.photo_url ? (
          <img src={shop.photo_url} alt={shop.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-2xl">🏪</span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-semibold truncate text-left" style={{ color: "hsl(var(--hud-text))" }}>{shop.title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} />
          <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{shop.rating.toFixed(1)} · {shop.category}</span>
        </div>
      </div>
    </button>
  );
});

/* ═══ Horizontal carousel ═══ */
const HomeCarousel = memo(function HomeCarousel({ title, items, onSeeAll }: { title: string; items: ShopSignal[]; onSeeAll?: () => void }) {
  const navigate = useNavigate();
  if (!items.length) return null;
  return (
    <div className="w-full max-w-md">
      <SectionLabel title={title} action="See all" onAction={onSeeAll} />
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {items.map((shop) => (
          <ShopCard key={shop.id} shop={shop} onClick={() => navigate(`/explore?shop=${shop.id}`)} />
        ))}
      </div>
    </div>
  );
});

/* ═══ Main component ═══ */
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

  // Fetch real conversations
  const { data: conversations } = useQuery({
    queryKey: ["home-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("conversation_threads" as any)
        .select("id, title, last_message_preview, updated_at, unread_count")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("updated_at", { ascending: false })
        .limit(4);
      return (data || []) as any[];
    },
    staleTime: 30_000,
    enabled: !!user?.id,
  });

  // Fetch real shops for marketplace
  const { data: dbShops } = useQuery({
    queryKey: ["home-shops"],
    queryFn: async () => {
      const { data } = await supabase
        .from("storefront_pages" as any)
        .select("id, shop_name, vertical, city, logo_url, latitude, longitude")
        .eq("published", true)
        .limit(20);
      return (data || []).map((s: any) => ({
        id: s.id,
        title: s.shop_name || "Shop",
        category: s.vertical || "shop",
        lat: s.latitude,
        lng: s.longitude,
        orderCount7d: 0,
        revenue7d: 0,
        conversionRate: 0,
        rating: 4.0 + Math.random() * 0.9,
        photo_url: s.logo_url,
        city: s.city,
      })) as ShopSignal[];
    },
    staleTime: 120_000,
  });

  // Build user signals
  const userSignals = useMemo<UserSignals>(() => ({
    userId: user?.id || "",
    lat: null,
    lng: null,
    recentCategories: [],
    recentSearches: [],
    recentOrdersCount: 0,
    recentRideCount: 0,
    recentWalletActions: 0,
    recentRealEstateActions: 0,
    merchantMode: false,
  }), [user?.id]);

  const shops = dbShops || [];
  const { rankedBlocks, nearbyTop, trending, topCuisine } = useSmartHomeFeed(userSignals, shops);

  // Format conversations for display
  const convRows = useMemo(() => {
    if (conversations && conversations.length > 0) {
      return conversations.map((c: any) => ({
        name: c.title || "Conversation",
        message: c.last_message_preview || "Tap to open",
        time: c.updated_at ? new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        unread: c.unread_count || 0,
      }));
    }
    return [
      { name: "Welcome", message: "Start a conversation", time: "now", unread: 0 },
    ];
  }, [conversations]);

  // Block renderer
  const renderBlock = useCallback((block: RankedBlock) => {
    switch (block.type) {
      case "orbit":
        return (
          <div key="orbit" className="w-full max-w-md">
            <SectionLabel title="ORBIT" action={t("nav.orbit") || "All"} onAction={() => navigate("/dashboard/communication")} />
            <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              {convRows.map((conv, i) => (
                <div key={conv.name + i} style={{ borderBottom: i < convRows.length - 1 ? "1px solid hsl(var(--hud-border) / 0.06)" : "none" }}>
                  <ConversationRow {...conv} onClick={() => navigate("/dashboard/communication")} />
                </div>
              ))}
            </div>
          </div>
        );

      case "nearby_food":
        return topCuisine.length > 0 ? (
          <HomeCarousel key="nearby_food" title="NEARBY CUISINE" items={topCuisine} onSeeAll={() => navigate("/explore?cat=food")} />
        ) : null;

      case "nearby_shops":
        return nearbyTop.length > 0 ? (
          <HomeCarousel key="nearby_shops" title="NEARBY SHOPS" items={nearbyTop} onSeeAll={() => navigate("/shops")} />
        ) : null;

      case "trending_shops":
        return trending.length > 0 ? (
          <HomeCarousel key="trending_shops" title="TRENDING NOW" items={trending} onSeeAll={() => navigate("/explore")} />
        ) : null;

      case "wallet":
        return (
          <div key="wallet" className="w-full max-w-md">
            <SectionLabel title="WALLET" />
            <OrbitWalletCard />
          </div>
        );

      case "ride":
        return (
          <div key="ride" className="w-full max-w-md">
            <button onClick={() => navigate("/ride")} className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-warning) / 0.12)" }}>
                <Car className="w-5 h-5" style={{ color: "hsl(var(--hud-warning))" }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Book a Ride</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Taxi & transport</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
            </button>
          </div>
        );

      case "real_estate":
        return (
          <div key="real_estate" className="w-full max-w-md">
            <button onClick={() => navigate("/real-estate")} className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-purple) / 0.12)" }}>
                <Building2 className="w-5 h-5" style={{ color: "hsl(var(--hud-purple))" }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Property</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Real estate & rentals</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
            </button>
          </div>
        );

      case "recent_activity":
        return null; // Will render when activity feed is available

      case "featured_ad":
        return null; // Reserved, sleeping

      default:
        return null;
    }
  }, [convRows, topCuisine, nearbyTop, trending, navigate, t]);

  return (
    <div className="flex flex-col items-center px-4 pt-3 pb-24 gap-5 min-h-full">
      {/* 1. Video Hero */}
      <VideoHero />

      {/* 2. Quick Actions */}
      <div className="w-full max-w-md">
        <div className="flex gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.label} onClick={() => navigate(a.path)} className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-transform min-h-[60px]" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
              <a.icon className="w-5 h-5" style={{ color: a.color }} />
              <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.65)" }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Categories */}
      <div className="w-full max-w-md">
        <SectionLabel title="CATEGORIES" />
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button key={cat.label} onClick={() => navigate(cat.path)} className="flex flex-col items-center gap-1.5 min-w-[58px] py-2.5 px-1.5 rounded-xl active:scale-95 transition-transform" style={{ background: "hsl(var(--hud-surface))" }}>
              <span className="text-lg leading-none">{cat.icon}</span>
              <span className="text-[10px] font-semibold truncate w-full text-center" style={{ color: "hsl(var(--hud-text-dim) / 0.65)" }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Dynamic ranked blocks */}
      {rankedBlocks.map(renderBlock)}

      {/* 5. Nearby Places — always at bottom */}
      <div className="w-full max-w-md">
        <button onClick={() => navigate("/super-map")} className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.12)" }}>
            <MapPin className="w-5 h-5" style={{ color: "hsl(var(--hud-cyan))" }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Nearby Places</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Shops, restaurants & services on map</p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
        </button>
      </div>
    </div>
  );
}
