/**
 * OrbitHome — Premium central hub. Clean, fast, WhatsApp-like.
 * Structure: Search → Conversations → Quick Actions → Categories → Marketplace → Wallet → Status
 */
import { useEffect, useMemo, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useOrbitDashboard } from "@/hooks/useOrbitDashboard";
import { useI18n } from "@/lib/i18n";
import { trackMount } from "@/lib/orbit-perf";
import OrbitSmartActions from "@/components/orbit/OrbitSmartActions";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import OrbitGlobalSearch from "@/components/orbit/OrbitGlobalSearch";
import { ChevronRight, Star, TrendingUp, Sparkles, MapPin } from "lucide-react";

/* ══════ Section Header ══════ */
const SectionLabel = memo(function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsl(var(--hud-text-dim) / 0.55)" }}>
        {title}
      </h2>
      {action && (
        <button onClick={onAction} className="text-[10px] font-semibold flex items-center gap-0.5 active:opacity-70" style={{ color: "hsl(var(--hud-cyan))" }}>
          {action}
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

/* ══════ Conversation Row ══════ */
const ConversationRow = memo(function ConversationRow({ name, message, time, unread, onClick }: {
  name: string; message: string; time: string; unread?: number; onClick: () => void;
}) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["hsl(var(--hud-cyan) / 0.2)", "hsl(210 60% 25%)", "hsl(260 40% 25%)", "hsl(340 40% 25%)"];
  const bg = colors[name.charCodeAt(0) % colors.length];

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] min-h-[56px]">
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: bg, color: "hsl(var(--hud-text))" }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: "hsl(var(--hud-text))" }}>{name}</p>
        <p className="text-[11px] truncate leading-snug mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.55)" }}>{message}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
        <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{time}</span>
        {unread != null && unread > 0 && (
          <span className="min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1" style={{ background: "hsl(var(--hud-cyan))", color: "#fff" }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
    </button>
  );
});

/* ══════ Marketplace Featured Card ══════ */
const FeaturedCard = memo(function FeaturedCard({ emoji, title, subtitle, badge, onClick }: {
  emoji: string; title: string; subtitle: string; badge?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col min-w-[140px] rounded-xl p-3 active:scale-[0.97] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{emoji}</span>
        {badge && (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--hud-cyan) / 0.15)", color: "hsl(var(--hud-cyan))" }}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[12px] font-semibold truncate text-left" style={{ color: "hsl(var(--hud-text))" }}>{title}</p>
      <p className="text-[10px] truncate text-left mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{subtitle}</p>
    </button>
  );
});

/* ══════ Category shortcut ══════ */
const CATEGORIES = [
  { icon: "🍽️", label: "Food", path: "/explore?cat=food" },
  { icon: "🛍️", label: "Shops", path: "/shops" },
  { icon: "🏠", label: "Property", path: "/real-estate" },
  { icon: "🚗", label: "Ride", path: "/ride" },
  { icon: "📦", label: "Delivery", path: "/send" },
  { icon: "✈️", label: "Travel", path: "/travel" },
] as const;

const CategoryRow = memo(function CategoryRow() {
  const navigate = useNavigate();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
      {CATEGORIES.map((cat) => (
        <button key={cat.label} onClick={() => navigate(cat.path)} className="flex flex-col items-center gap-1.5 min-w-[58px] py-2.5 px-1.5 rounded-xl active:scale-95 transition-transform" style={{ background: "hsl(var(--hud-surface))" }}>
          <span className="text-lg leading-none">{cat.icon}</span>
          <span className="text-[10px] font-semibold truncate w-full text-center" style={{ color: "hsl(var(--hud-text-dim) / 0.65)" }}>{cat.label}</span>
        </button>
      ))}
    </div>
  );
});

/* ══════ Featured marketplace data ══════ */
const FEATURED_SHOPS = [
  { emoji: "🍔", title: "Burger Palace", subtitle: "Fast Food · 4.8★", badge: "NEW" },
  { emoji: "🍕", title: "Pizza Express", subtitle: "Italian · 4.6★" },
  { emoji: "☕", title: "Café Noir", subtitle: "Coffee · 4.9★", badge: "TOP" },
  { emoji: "🛒", title: "Fresh Market", subtitle: "Grocery · 4.5★" },
  { emoji: "💇", title: "Style Studio", subtitle: "Beauty · 4.7★" },
];

const TRENDING_ITEMS = [
  { emoji: "🎧", title: "AirPods Pro", subtitle: "Electronics", badge: "-20%" },
  { emoji: "👟", title: "Running Shoes", subtitle: "Sports", badge: "HOT" },
  { emoji: "📱", title: "Phone Case", subtitle: "Accessories" },
  { emoji: "🧴", title: "Skincare Set", subtitle: "Beauty", badge: "NEW" },
];

/* ══════ Mock conversations ══════ */
const MOCK_CONVERSATIONS = [
  { name: "Sarah Johnson", message: "See you tomorrow at the office!", time: "2m", unread: 2 },
  { name: "Property Manager", message: "Rent payment confirmed ✓", time: "15m", unread: 0 },
  { name: "Delivery Support", message: "Your package is on the way", time: "1h", unread: 1 },
  { name: "Ahmed Ali", message: "Thanks for the quick response", time: "3h", unread: 0 },
];

export default function OrbitHome() {
  const mountStart = useMemo(() => performance.now(), []);
  const { user, orgId } = useAuth();
  const engine = useOrbitEngine();
  const { smartActions, loading: dashLoading } = useOrbitDashboard();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => { trackMount("OrbitHome", mountStart); }, [mountStart]);
  useEffect(() => {
    if (!user?.id) return;
    engine.refresh(user.id, orgId || undefined);
  }, [user?.id, orgId]);

  const systemItems = useMemo(() => [
    { label: t("orbit.home.encryption") || "E2E", ok: engine.encryptionStatus === "active" },
    { label: engine.syncStatus === "synced" ? (t("orbit.home.synced") || "Synced") : engine.syncStatus === "syncing" ? (t("orbit.home.sync_short") || "Syncing") : (t("orbit.home.error") || "Error"), ok: engine.syncStatus === "synced" },
    { label: engine.networkStatus === "online" ? (t("orbit.home.online") || "Online") : (t("orbit.home.offline_short") || "Offline"), ok: engine.networkStatus === "online" },
  ], [engine.encryptionStatus, engine.syncStatus, engine.networkStatus, t]);

  return (
    <div className="flex flex-col items-center px-4 pt-3 pb-10 gap-4 min-h-full">
      {/* 1. Search */}
      <div className="w-full max-w-md">
        <OrbitGlobalSearch />
      </div>

      {/* 2. Recent Conversations — Orbit central block */}
      <div className="w-full max-w-md">
        <SectionLabel title="MESSAGES" action="All" onAction={() => navigate("/orbit/contacts")} />
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          {MOCK_CONVERSATIONS.map((conv, i) => (
            <div key={conv.name} style={{ borderBottom: i < MOCK_CONVERSATIONS.length - 1 ? "1px solid hsl(var(--hud-border) / 0.06)" : "none" }}>
              <ConversationRow {...conv} onClick={() => navigate("/dashboard/communication")} />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Quick Actions */}
      <div className="w-full max-w-md">
        <OrbitSmartActions actions={smartActions} loading={dashLoading} />
      </div>

      {/* 4. Category Shortcuts */}
      <div className="w-full max-w-md">
        <SectionLabel title="CATEGORIES" />
        <CategoryRow />
      </div>

      {/* 5. Featured Shops — Marketplace section */}
      <div className="w-full max-w-md">
        <SectionLabel title="FEATURED" action="See all" onAction={() => navigate("/explore")} />
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {FEATURED_SHOPS.map((shop) => (
            <FeaturedCard key={shop.title} {...shop} onClick={() => navigate("/explore")} />
          ))}
        </div>
      </div>

      {/* 6. Trending / Deals */}
      <div className="w-full max-w-md">
        <SectionLabel title="TRENDING" action="More" onAction={() => navigate("/explore")} />
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {TRENDING_ITEMS.map((item) => (
            <FeaturedCard key={item.title} {...item} onClick={() => navigate("/explore")} />
          ))}
        </div>
      </div>

      {/* 7. Nearby — Map preview */}
      <div className="w-full max-w-md">
        <button onClick={() => navigate("/super-map")} className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.12)" }}>
            <MapPin className="w-5 h-5" style={{ color: "hsl(var(--hud-cyan))" }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Nearby Places</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Explore shops, restaurants & services around you</p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
        </button>
      </div>

      {/* 8. Wallet Preview */}
      <div className="w-full max-w-md">
        <SectionLabel title="WALLET" />
        <OrbitWalletCard />
      </div>

      {/* 9. System Status */}
      <div className="w-full max-w-md flex items-center justify-center gap-5 py-2 px-3 rounded-xl" style={{ background: "hsl(var(--hud-surface) / 0.4)" }}>
        {systemItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.ok ? "hsl(var(--hud-success))" : "hsl(var(--hud-danger))" }} />
            <span className="text-[9px] font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.45)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
