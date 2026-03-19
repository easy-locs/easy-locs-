/**
 * OrbitHome — Premium performance-first command center.
 * Fast search, recent conversations, quick actions, category shortcuts, FAB.
 */
import { useEffect, useMemo, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useOrbitDashboard } from "@/hooks/useOrbitDashboard";
import { useI18n } from "@/lib/i18n";
import { trackMount } from "@/lib/orbit-perf";
import OrbitOrb from "@/components/orbit/OrbitOrb";
import OrbitQuickCard from "@/components/orbit/OrbitQuickCard";
import OrbitSmartActions from "@/components/orbit/OrbitSmartActions";
import OrbitWalletCard from "@/components/orbit/OrbitWalletCard";
import OrbitGlobalSearch from "@/components/orbit/OrbitGlobalSearch";
import { OrbitCardSkeleton } from "@/components/orbit/OrbitPremiumCard";
import {
  MessageCircle, Phone, Users, Store, Wallet,
  Bell, Shield, Lock,
  ChevronRight, CalendarCheck, ShoppingBag, Building2,
  TrendingUp, CreditCard, Fingerprint, History,
  Scan, Package, Truck, Sparkles, BarChart3,
  Globe, Layers, KeyRound, User, MapPin, Zap, Palette, Video,
} from "lucide-react";

/* ══════ Section Header ══════ */
const SectionLabel = memo(function SectionLabel({ title, badge }: { title: string; badge?: number }) {
  return (
    <div className="flex items-center justify-between mb-2.5 px-0.5">
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "hsl(var(--hud-text-dim) / 0.7)" }}
      >
        {title}
      </h2>
      {badge != null && badge > 0 && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "hsl(var(--hud-danger) / 0.12)", color: "hsl(var(--hud-danger))" }}
        >
          {badge}
        </span>
      )}
    </div>
  );
});

/* ══════ Category shortcut row ══════ */
const CATEGORIES = [
  { icon: "🍽️", label: "Food", path: "/explore?cat=food" },
  { icon: "🏠", label: "Real Estate", path: "/real-estate" },
  { icon: "🚗", label: "Ride", path: "/ride" },
  { icon: "🛍️", label: "Shops", path: "/shops" },
  { icon: "📦", label: "Delivery", path: "/send" },
  { icon: "✈️", label: "Travel", path: "/travel" },
] as const;

const CategoryRow = memo(function CategoryRow() {
  const navigate = useNavigate();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.label}
          onClick={() => navigate(cat.path)}
          className="flex flex-col items-center gap-1 min-w-[56px] py-2 px-1 rounded-xl active:scale-95 transition-transform"
          style={{ background: "hsl(var(--hud-surface))" }}
        >
          <span className="text-lg">{cat.icon}</span>
          <span className="text-[10px] font-medium truncate w-full text-center" style={{ color: "hsl(var(--hud-text-dim) / 0.7)" }}>
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
});

export default function OrbitHome() {
  const mountStart = useMemo(() => performance.now(), []);
  const { user, orgId } = useAuth();
  const engine = useOrbitEngine();
  const { smartActions, loading: dashLoading } = useOrbitDashboard();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    trackMount("OrbitHome", mountStart);
  }, [mountStart]);

  useEffect(() => {
    if (!user?.id) return;
    engine.refresh(user.id, orgId || undefined);
  }, [user?.id, orgId]);

  /* ── Card definitions ── */
  const PRIORITY_CARDS = useMemo(() => [
    { icon: MessageCircle, label: t("orbit.card.messages"), desc: t("orbit.card.desc_inbox"), key: "unreadMessages" as const, to: "/dashboard/communication" },
    { icon: Phone, label: t("orbit.card.calls"), desc: t("orbit.card.desc_recent"), key: "missedCalls" as const, to: "/dashboard/communication?section=calls" },
    { icon: Bell, label: t("orbit.card.alerts"), desc: t("orbit.card.desc_notifs"), key: "pendingNotifications" as const, to: "/dashboard/settings?section=notifications" },
    { icon: Users, label: t("orbit.card.contacts"), desc: t("orbit.card.desc_network"), key: "activeContacts" as const, to: "/dashboard/communication?section=contacts" },
  ], [t]);

  const ORBIT_INFRA_CARDS = useMemo(() => [
    { icon: Wallet, label: t("orbit.card.wallet"), desc: t("orbit.card.desc_balance"), key: null, to: "/dashboard/wallet" },
    { icon: CreditCard, label: t("orbit.card.payments"), desc: t("orbit.card.desc_sends"), key: null, to: "/dashboard/wallet?action=history" },
    { icon: History, label: t("orbit.card.history"), desc: t("orbit.card.desc_activity"), key: null, to: "/dashboard/wallet?action=history" },
    { icon: Shield, label: t("orbit.card.security"), desc: t("orbit.card.desc_2fa"), key: null, to: "/dashboard/settings?section=security" },
    { icon: Fingerprint, label: t("orbit.card.identity"), desc: t("orbit.card.desc_profile"), key: null, to: "/dashboard/settings" },
    { icon: Lock, label: t("orbit.card.private"), desc: t("orbit.card.desc_data"), key: null, to: "/dashboard/settings?section=privacy" },
  ], [t]);

  const MARKETPLACE_CARDS = useMemo(() => [
    { icon: Store, label: t("orbit.card.listings"), desc: t("orbit.card.desc_services"), key: "activeListings" as const, to: "/dashboard/my-shop" },
    { icon: ShoppingBag, label: t("orbit.card.bookings"), desc: t("orbit.card.desc_orders"), key: "pendingOrders" as const, to: "/my-orders" },
    { icon: TrendingUp, label: t("orbit.card.leads"), desc: t("orbit.card.desc_prospects"), key: "newLeads" as const, to: "/dashboard/communication" },
  ], [t]);

  const V6_CARDS = useMemo(() => [
    { icon: Scan, label: "POS", desc: "Point of Sale", key: null, to: "/pos" },
    { icon: Package, label: "Inventory", desc: "Stock mgmt", key: null, to: "/dashboard/my-shop" },
    { icon: BarChart3, label: "Analytics", desc: "Reports", key: null, to: "/dashboard/seller" },
    { icon: Truck, label: "Delivery", desc: "Logistics", key: null, to: "/dashboard/driver" },
  ], []);

  const PROPERTY_CARDS = useMemo(() => [
    { icon: Building2, label: "Properties", desc: "Manage assets", key: null, to: "/real-estate" },
    { icon: KeyRound, label: "Landlord", desc: "Owner hub", key: null, to: "/dashboard" },
    { icon: User, label: "Tenant", desc: "Portal", key: null, to: "/tenant" },
    { icon: CalendarCheck, label: "Seasonal", desc: "Short-term", key: "pendingBookings" as const, to: "/dashboard/seasonal" },
  ], []);

  const MODULE_CARDS = useMemo(() => [
    { icon: MapPin, label: "Explore", desc: "Nearby", key: null, to: "/explore" },
    { icon: Zap, label: "Deals", desc: "Negotiations", key: null, to: "/dashboard/deals" },
    { icon: Palette, label: t("orbit.card.settings"), desc: t("orbit.card.desc_config"), key: null, to: "/dashboard/settings" },
  ], [t]);

  const orbMessage = useMemo(() => {
    if (engine.syncStatus === "syncing") return t("orbit.home.syncing");
    if (engine.syncStatus === "error") return t("orbit.home.sync_error");
    if (engine.networkStatus === "offline") return t("orbit.home.offline");
    if (engine.alerts.length > 0) return engine.alerts[0].message;
    if (engine.activeListings > 0)
      return t("orbit.home.active_listings").replace("{count}", String(engine.activeListings));
    return t("orbit.home.all_good");
  }, [engine.alerts, engine.syncStatus, engine.networkStatus, engine.activeListings, t]);

  const totalUrgent = engine.unreadMessages + engine.missedCalls + engine.pendingBookings + engine.newLeads;

  const activityItems = useMemo(() => {
    const items: { icon: string; label: string; value: number; link: string }[] = [];
    if (engine.pendingBookings > 0) items.push({ icon: "📩", label: t("orbit.home.pending_bookings"), value: engine.pendingBookings, link: "/dashboard/seasonal" });
    if (engine.pendingOrders > 0) items.push({ icon: "🎯", label: t("orbit.home.marketplace_orders"), value: engine.pendingOrders, link: "/my-orders" });
    if (engine.newLeads > 0) items.push({ icon: "🔥", label: t("orbit.home.new_leads"), value: engine.newLeads, link: "/dashboard/communication" });
    if (engine.activeListings > 0) items.push({ icon: "📊", label: t("orbit.home.active_ads"), value: engine.activeListings, link: "/dashboard/my-shop" });
    return items;
  }, [engine.pendingBookings, engine.pendingOrders, engine.newLeads, engine.activeListings, t]);

  const systemItems = useMemo(() => [
    { label: t("orbit.home.encryption"), ok: engine.encryptionStatus === "active" },
    { label: engine.syncStatus === "synced" ? t("orbit.home.synced") : engine.syncStatus === "syncing" ? t("orbit.home.sync_short") : t("orbit.home.error"), ok: engine.syncStatus === "synced" },
    { label: engine.networkStatus === "online" ? t("orbit.home.online") : t("orbit.home.offline_short"), ok: engine.networkStatus === "online" },
  ], [engine.encryptionStatus, engine.syncStatus, engine.networkStatus, t]);

  const handleActivityClick = useCallback((link: string) => navigate(link), [navigate]);

  return (
    <div className="flex flex-col items-center px-4 pt-3 pb-10 gap-5 min-h-full">
      {/* Search */}
      <div className="w-full max-w-md">
        <OrbitGlobalSearch />
      </div>

      {/* Orb */}
      <OrbitOrb contextMessage={orbMessage} />

      {/* Category shortcuts */}
      <div className="w-full max-w-md">
        <SectionLabel title="SHORTCUTS" />
        <CategoryRow />
      </div>

      {/* Alert Banner */}
      {engine.alerts.length > 0 && (
        <button
          onClick={() => engine.alerts[0]?.link && navigate(engine.alerts[0].link)}
          aria-label={engine.alerts[0].title}
          className="w-full max-w-md rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, hsl(var(--hud-surface)), hsl(var(--hud-surface-2)))",
            border: "1px solid hsl(var(--hud-cyan) / 0.18)",
          }}
        >
          <span className="text-xl shrink-0">{engine.alerts[0].icon}</span>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold leading-snug truncate" style={{ color: "hsl(var(--hud-text))" }}>
              {engine.alerts[0].title}
            </p>
            <p className="text-[11px] truncate" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {engine.alerts[0].message}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
        </button>
      )}

      {/* Smart Actions */}
      <div className="w-full max-w-md">
        <OrbitSmartActions actions={smartActions} loading={dashLoading} />
      </div>

      {/* Wallet */}
      <div className="w-full max-w-md">
        <SectionLabel title={t("orbit.home.section_wallet")} />
        <OrbitWalletCard />
      </div>

      {/* Priorities */}
      <div className="w-full max-w-md">
        <SectionLabel title={t("orbit.home.section_priorities")} badge={totalUrgent || undefined} />
        <div className="grid grid-cols-4 gap-2.5">
          {PRIORITY_CARDS.map((card) => (
            <OrbitQuickCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              description={card.desc}
              counter={card.key ? (engine[card.key] as number) : undefined}
              status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
              to={card.to}
            />
          ))}
        </div>
      </div>

      {/* Activity Widget */}
      {activityItems.length > 0 && (
        <div className="w-full max-w-md">
          <SectionLabel title={t("orbit.home.section_activity")} />
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}
          >
            {activityItems.slice(0, 4).map((item, i) => (
              <button
                key={item.label}
                onClick={() => handleActivityClick(item.link)}
                aria-label={`${item.label}: ${item.value}`}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all active:scale-[0.98] min-h-[44px]"
                style={{ borderBottom: i < activityItems.length - 1 ? "1px solid hsl(var(--hud-border) / 0.06)" : "none" }}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="flex-1 text-left text-[12px] font-medium truncate" style={{ color: "hsl(var(--hud-text))" }}>
                  {item.label}
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full"
                  style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}
                >
                  {item.value}
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Commerce */}
      <div className="w-full max-w-md">
        <SectionLabel title="COMMERCE" />
        <div className="grid grid-cols-4 gap-2.5">
          {V6_CARDS.map((card) => (
            <OrbitQuickCard key={card.label} icon={card.icon} label={card.label} description={card.desc} to={card.to} />
          ))}
        </div>
      </div>

      {/* Property Management */}
      <div className="w-full max-w-md">
        <SectionLabel title="PROPERTY" />
        <div className="grid grid-cols-4 gap-2.5">
          {PROPERTY_CARDS.map((card) => (
            <OrbitQuickCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              description={card.desc}
              counter={card.key ? (engine[card.key] as number) : undefined}
              status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
              to={card.to}
            />
          ))}
        </div>
      </div>

      {/* Infrastructure */}
      <div className="w-full max-w-md">
        <SectionLabel title={t("orbit.home.section_infrastructure")} />
        <div className="grid grid-cols-3 gap-2.5">
          {ORBIT_INFRA_CARDS.map((card) => (
            <OrbitQuickCard key={card.label} icon={card.icon} label={card.label} description={card.desc} to={card.to} />
          ))}
        </div>
      </div>

      {/* Marketplace */}
      <div className="w-full max-w-md">
        <SectionLabel title={t("orbit.home.section_marketplace")} />
        <div className="grid grid-cols-3 gap-2.5">
          {MARKETPLACE_CARDS.map((card) => (
            <OrbitQuickCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              description={card.desc}
              counter={card.key ? (engine[card.key] as number) : undefined}
              status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
              to={card.to}
            />
          ))}
        </div>
      </div>

      {/* Modules */}
      <div className="w-full max-w-md">
        <SectionLabel title={t("orbit.home.section_modules")} />
        <div className="grid grid-cols-3 gap-2.5">
          {MODULE_CARDS.map((card) => (
            <OrbitQuickCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              description={card.desc}
              counter={card.key ? (engine[card.key] as number) : undefined}
              status={card.key && (engine[card.key] as number) > 0 ? "active" : "idle"}
              to={card.to}
            />
          ))}
        </div>
      </div>

      {/* System Status */}
      <div
        className="w-full max-w-md flex items-center justify-center gap-6 py-3 px-4 rounded-2xl"
        role="status"
        style={{
          background: "hsl(var(--hud-surface) / 0.5)",
          border: "1px solid hsl(var(--hud-border) / 0.06)",
        }}
      >
        {systemItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{
                background: item.ok ? "hsl(var(--hud-success))" : "hsl(var(--hud-danger))",
                boxShadow: item.ok ? "0 0 6px hsl(var(--hud-success) / 0.5)" : "none",
              }}
            />
            <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {engine.lastSyncAt && (
        <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
          Sync : {new Date(engine.lastSyncAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
