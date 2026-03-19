/**
 * OrbitHome — Smart dynamic home. Orbit-first, ranked blocks, real DB data.
 */
import { useEffect, useMemo, memo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useI18n } from "@/lib/i18n";
import { trackMount } from "@/lib/orbit-perf";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import { ChevronRight, MessageCircle, Phone, Wallet, ScanLine, MapPin, Car, Building2, Star, Send, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSmartHomeFeed } from "@/hooks/useSmartHomeFeed";
import type { UserSignals, ShopSignal, RankedBlock } from "@/lib/home/home-ranking";

/* ═══ Orbit Hero Block — strongest visual ═══ */
const OrbitHero = memo(function OrbitHero({ convRows, onNavigate }: {
  convRows: Array<{ name: string; message: string; time: string; unread: number }>;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="w-full max-w-md">
      {/* Orbit branded header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan))", boxShadow: "0 0 16px hsl(var(--hud-cyan) / 0.4)" }}>
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight" style={{ color: "hsl(var(--hud-text))" }}>Orbit</h1>
            <p className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>Communication Hub</p>
          </div>
        </div>
        <button onClick={() => onNavigate("/dashboard/communication")} className="text-[10px] font-semibold flex items-center gap-0.5 active:opacity-70 px-2 py-1 rounded-lg" style={{ color: "hsl(var(--hud-cyan))", background: "hsl(var(--hud-cyan) / 0.08)" }}>
          View all<ChevronRight className="w-3 h-3" />
        </button>
      </div>
      {/* Conversation list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-cyan) / 0.12)", boxShadow: "0 0 24px hsl(var(--hud-cyan) / 0.06)" }}>
        {convRows.map((conv, i) => (
          <ConversationRow key={conv.name + i} {...conv} onClick={() => onNavigate("/dashboard/communication")}
            isLast={i === convRows.length - 1} />
        ))}
      </div>
      {/* Quick action pills */}
      <div className="flex gap-2 mt-3">
        {[
          { icon: MessageCircle, label: "Message", path: "/dashboard/communication", color: "hsl(var(--hud-cyan))" },
          { icon: Phone, label: "Call", path: "/dashboard/communication?section=calls", color: "hsl(var(--hud-success))" },
          { icon: Wallet, label: "Pay", path: "/wallet/hub", color: "hsl(var(--hud-warning))" },
          { icon: ScanLine, label: "Scan", path: "/qr/entry/scan", color: "hsl(var(--hud-purple))" },
        ].map((a) => (
          <button key={a.label} onClick={() => onNavigate(a.path)} className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl active:scale-95 transition-transform min-h-[52px]" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
            <a.icon className="w-4.5 h-4.5" style={{ color: a.color }} />
            <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

/* ═══ Conversation row ═══ */
const ConversationRow = memo(function ConversationRow({ name, message, time, unread, onClick, isLast }: {
  name: string; message: string; time: string; unread?: number; onClick: () => void; isLast?: boolean;
}) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["hsl(var(--hud-cyan) / 0.2)", "hsl(210 60% 25%)", "hsl(260 40% 25%)", "hsl(340 40% 25%)"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3.5 py-3 transition-all active:scale-[0.98] min-h-[56px]"
      style={{ borderBottom: isLast ? "none" : "1px solid hsl(var(--hud-border) / 0.06)" }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: bg, color: "hsl(var(--hud-text))" }}>{initials}</div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: "hsl(var(--hud-text))" }}>{name}</p>
        <p className="text-[11px] truncate leading-snug mt-0.5 max-w-[200px]" style={{ color: "hsl(var(--hud-text-dim) / 0.55)" }}>{message}</p>
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

/* ═══ Section header ═══ */
const SectionLabel = memo(function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{title}</h2>
      {action && (
        <button onClick={onAction} className="text-[10px] font-semibold flex items-center gap-0.5 active:opacity-70" style={{ color: "hsl(var(--hud-cyan))" }}>
          {action}<ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

/* ═══ Categories ═══ */
const CATEGORIES = [
  { icon: "🍽️", label: "Food", path: "/food" },
  { icon: "🛍️", label: "Shops", path: "/shops" },
  { icon: "🏠", label: "Property", path: "/real-estate" },
  { icon: "🚕", label: "Taxi", path: "/ride" },
  { icon: "📦", label: "Send", path: "/send" },
  { icon: "✈️", label: "Travel", path: "/travel" },
  { icon: "🛒", label: "Grocery", path: "/grocery" },
  { icon: "🔧", label: "Services", path: "/services-hub" },
] as const;

/* ═══ Shop card for carousels ═══ */
const ShopCard = memo(function ShopCard({ shop, onClick }: { shop: ShopSignal; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col min-w-[130px] max-w-[130px] rounded-xl overflow-hidden active:scale-[0.97] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
      <div className="w-full h-[72px] flex items-center justify-center" style={{ background: "hsl(var(--hud-surface-2))" }}>
        {shop.photo_url ? (
          <img src={shop.photo_url} alt={shop.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-2xl">🏪</span>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-semibold truncate text-left" style={{ color: "hsl(var(--hud-text))" }}>{shop.title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-2.5 h-2.5" style={{ color: "hsl(45 90% 55%)", fill: "hsl(45 90% 55%)" }} />
          <span className="text-[9px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{shop.rating.toFixed(1)}</span>
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
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {items.map((shop) => (
          <ShopCard key={shop.id} shop={shop} onClick={() => navigate(`/explore?shop=${shop.id}`)} />
        ))}
      </div>
    </div>
  );
});

/* ═══ Link card ═══ */
const LinkCard = memo(function LinkCard({ icon: Icon, title, subtitle, path, color }: {
  icon: React.ElementType; title: string; subtitle: string; path: string; color: string;
}) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(path)} className="w-full rounded-2xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color.replace(")", " / 0.12)")}` }}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[12px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{title}</p>
        <p className="text-[10px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
    </button>
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

  // Fetch real shops
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

  const userSignals = useMemo<UserSignals>(() => ({
    userId: user?.id || "",
    lat: null, lng: null,
    recentCategories: [], recentSearches: [],
    recentOrdersCount: 0, recentRideCount: 0,
    recentWalletActions: 0, recentRealEstateActions: 0,
    merchantMode: false,
  }), [user?.id]);

  const shops = dbShops || [];
  const { rankedBlocks, nearbyTop, trending, topCuisine } = useSmartHomeFeed(userSignals, shops);

  const convRows = useMemo(() => {
    if (conversations && conversations.length > 0) {
      return conversations.map((c: any) => ({
        name: c.title || "Conversation",
        message: c.last_message_preview || "Tap to open",
        time: c.updated_at ? new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        unread: c.unread_count || 0,
      }));
    }
    return [{ name: "Welcome", message: "Start a conversation", time: "now", unread: 0 }];
  }, [conversations]);

  const renderBlock = useCallback((block: RankedBlock) => {
    switch (block.type) {
      case "orbit": return null; // Rendered separately above
      case "nearby_food":
        return topCuisine.length > 0 ? <HomeCarousel key="nearby_food" title="NEARBY CUISINE" items={topCuisine} onSeeAll={() => navigate("/explore?cat=food")} /> : null;
      case "nearby_shops":
        return nearbyTop.length > 0 ? <HomeCarousel key="nearby_shops" title="NEARBY SHOPS" items={nearbyTop} onSeeAll={() => navigate("/shops")} /> : null;
      case "trending_shops":
        return trending.length > 0 ? <HomeCarousel key="trending_shops" title="TRENDING NOW" items={trending} onSeeAll={() => navigate("/explore")} /> : null;
      case "wallet":
        return <div key="wallet" className="w-full max-w-md"><SectionLabel title="WALLET" /><OrbitWalletCard /></div>;
      case "ride":
        return <div key="ride" className="w-full max-w-md"><LinkCard icon={Car} title="Book a Ride" subtitle="Taxi & transport" path="/ride" color="hsl(var(--hud-warning))" /></div>;
      case "real_estate":
        return <div key="real_estate" className="w-full max-w-md"><LinkCard icon={Building2} title="Property" subtitle="Real estate & rentals" path="/real-estate" color="hsl(var(--hud-purple))" /></div>;
      default: return null;
    }
  }, [topCuisine, nearbyTop, trending, navigate]);

  return (
    <div className="flex flex-col items-center px-4 pt-3 pb-24 gap-4 min-h-full">
      {/* 1. ORBIT — strongest block, first position */}
      <OrbitHero convRows={convRows} onNavigate={navigate} />

      {/* 2. Categories */}
      <div className="w-full max-w-md">
        <SectionLabel title="CATEGORIES" />
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button key={cat.label} onClick={() => navigate(cat.path)} className="flex flex-col items-center gap-1 min-w-[54px] py-2 px-1 rounded-xl active:scale-95 transition-transform" style={{ background: "hsl(var(--hud-surface))" }}>
              <span className="text-base leading-none">{cat.icon}</span>
              <span className="text-[9px] font-semibold truncate w-full text-center" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Dynamic ranked blocks (excluding orbit which is already rendered) */}
      {rankedBlocks.filter(b => b.type !== "orbit").map(renderBlock)}

      {/* 4. Nearby Places */}
      <div className="w-full max-w-md">
        <LinkCard icon={MapPin} title="Nearby Places" subtitle="Shops, restaurants & services" path="/super-map" color="hsl(var(--hud-cyan))" />
      </div>
    </div>
  );
}
