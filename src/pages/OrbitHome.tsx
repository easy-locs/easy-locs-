/**
 * OrbitHome — Clean home screen. Orbit-first, then marketplace, then wallet.
 * Structure: Orbit block → Quick Actions → Categories → Featured → Wallet
 */
import { useEffect, useMemo, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useI18n } from "@/lib/i18n";
import { trackMount } from "@/lib/orbit-perf";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import { ChevronRight, MessageCircle, Phone, Wallet, ScanLine, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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

/* ═══ Quick action pill ═══ */
const QUICK_ACTIONS = [
  { icon: MessageCircle, label: "Message", path: "/dashboard/communication", color: "hsl(var(--hud-cyan))" },
  { icon: Phone, label: "Call", path: "/dashboard/communication?section=calls", color: "hsl(var(--hud-success))" },
  { icon: Wallet, label: "Pay", path: "/wallet/hub", color: "hsl(var(--hud-warning))" },
  { icon: ScanLine, label: "Scan", path: "/qr/entry/scan", color: "hsl(var(--hud-purple))" },
] as const;

/* ═══ Category shortcuts ═══ */
const CATEGORIES = [
  { icon: "🍽️", label: "Food", path: "/explore?cat=food" },
  { icon: "🛍️", label: "Shops", path: "/shops" },
  { icon: "🏠", label: "Property", path: "/real-estate" },
  { icon: "🚗", label: "Ride", path: "/ride" },
  { icon: "📦", label: "Delivery", path: "/send" },
  { icon: "✈️", label: "Travel", path: "/travel" },
] as const;

/* ═══ Mock conversations (replace with real when wired) ═══ */
const MOCK_CONVERSATIONS = [
  { name: "Sarah Johnson", message: "See you tomorrow at the office!", time: "2m", unread: 2 },
  { name: "Property Manager", message: "Rent payment confirmed ✓", time: "15m", unread: 0 },
  { name: "Delivery Support", message: "Your package is on the way", time: "1h", unread: 1 },
];

/* ═══ Featured card ═══ */
const FeaturedCard = memo(function FeaturedCard({ title, subtitle, imageUrl, onClick }: {
  title: string; subtitle: string; imageUrl?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col min-w-[140px] rounded-xl overflow-hidden active:scale-[0.97] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
      {imageUrl ? (
        <div className="w-full h-20 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
      ) : (
        <div className="w-full h-20 flex items-center justify-center" style={{ background: "hsl(var(--hud-surface-2))" }}>
          <span className="text-2xl">🏪</span>
        </div>
      )}
      <div className="p-2.5">
        <p className="text-[12px] font-semibold truncate text-left" style={{ color: "hsl(var(--hud-text))" }}>{title}</p>
        <p className="text-[10px] truncate text-left mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{subtitle}</p>
      </div>
    </button>
  );
});

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

  // Real marketplace data
  const { data: featuredServices } = useQuery({
    queryKey: ["home-featured-services"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_marketplace_services" as any).limit(6);
      return (data || []) as any[];
    },
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col items-center px-4 pt-3 pb-10 gap-5 min-h-full">
      {/* 1. ORBIT — Central communication block */}
      <div className="w-full max-w-md">
        <SectionLabel title="ORBIT" action={t("nav.orbit") || "All"} onAction={() => navigate("/dashboard/communication")} />
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          {MOCK_CONVERSATIONS.map((conv, i) => (
            <div key={conv.name} style={{ borderBottom: i < MOCK_CONVERSATIONS.length - 1 ? "1px solid hsl(var(--hud-border) / 0.06)" : "none" }}>
              <ConversationRow {...conv} onClick={() => navigate("/dashboard/communication")} />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Quick Actions — 4 pills */}
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

      {/* 4. Featured — Real data from DB */}
      <div className="w-full max-w-md">
        <SectionLabel title="MARKETPLACE" action="Achille" onAction={() => navigate("/explore")} />
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {(featuredServices && featuredServices.length > 0 ? featuredServices : [
            { title: "Explore Services", category: "marketplace", city: "" },
            { title: "Browse Shops", category: "shops", city: "" },
          ]).map((s: any, i: number) => (
            <FeaturedCard
              key={s.id || i}
              title={s.title || "Service"}
              subtitle={`${s.category || "Service"} · ${s.city || ""}`}
              imageUrl={s.photo_urls?.[0]}
              onClick={() => navigate(s.booking_slug ? `/explore?service=${s.id}` : "/explore")}
            />
          ))}
        </div>
      </div>

      {/* 5. Nearby */}
      <div className="w-full max-w-md">
        <button onClick={() => navigate("/super-map")} className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.12)" }}>
            <MapPin className="w-5 h-5" style={{ color: "hsl(var(--hud-cyan))" }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Nearby Places</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Shops, restaurants & services</p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
        </button>
      </div>

      {/* 6. Wallet Preview */}
      <div className="w-full max-w-md">
        <SectionLabel title="WALLET" />
        <OrbitWalletCard />
      </div>
    </div>
  );
}
