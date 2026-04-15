import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationsCenter } from "@/hooks/useNotificationsCenter";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, CheckCheck, Trash2, ArrowLeft, Settings,
  CreditCard, MessageSquare, ShoppingBag, Truck, Shield, Zap, MapPin,
  Inbox, CalendarCheck, Home, FileText, Newspaper,
} from "lucide-react";

const DOMAIN_ICONS: Record<string, typeof Bell> = {
  wallet: CreditCard,
  orbit: MessageSquare,
  mobility: MapPin,
  food_delivery: ShoppingBag,
  parcel_delivery: Truck,
  merchant: ShoppingBag,
  admin: Shield,
  system: Zap,
  booking: CalendarCheck,
  real_estate: Home,
  news: Newspaper,
};

type FilterTab = "all" | "unread" | "wallet" | "orbit" | "orders" | "booking" | "real_estate" | "news" | "system";

const FILTER_TABS: { key: FilterTab; labelKey: string; fallback: string; icon: typeof Bell }[] = [
  { key: "all", labelKey: "notifications.filter_all", fallback: "All", icon: Inbox },
  { key: "unread", labelKey: "notifications.filter_unread", fallback: "Unread", icon: Bell },
  { key: "booking", labelKey: "notifications.filter_booking", fallback: "Bookings", icon: CalendarCheck },
  { key: "real_estate", labelKey: "notifications.filter_real_estate", fallback: "Property", icon: Home },
  { key: "wallet", labelKey: "notifications.filter_wallet", fallback: "Wallet", icon: CreditCard },
  { key: "orbit", labelKey: "notifications.filter_orbit", fallback: "Messages", icon: MessageSquare },
  { key: "orders", labelKey: "notifications.filter_orders", fallback: "Orders", icon: ShoppingBag },
  { key: "news", labelKey: "notifications.filter_news", fallback: "News", icon: Newspaper },
  { key: "system", labelKey: "notifications.filter_system", fallback: "System", icon: Shield },
];

function matchesFilter(notif: { domain: string; read_at: string | null }, filter: FilterTab): boolean {
  switch (filter) {
    case "all": return true;
    case "unread": return !notif.read_at;
    case "wallet": return notif.domain === "wallet";
    case "orbit": return notif.domain === "orbit";
    case "booking": return notif.domain === "booking";
    case "real_estate": return notif.domain === "real_estate";
    case "news": return notif.domain === "news";
    case "orders": return notif.domain === "merchant" || notif.domain === "food_delivery" || notif.domain === "parcel_delivery" || notif.domain === "mobility";
    case "system": return notif.domain === "system" || notif.domain === "admin";
    default: return true;
  }
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return "today";
  if (date >= yesterday) return "yesterday";
  if (date >= weekAgo) return "this_week";
  return "earlier";
}

const DATE_GROUP_LABELS: Record<string, { key: string; fallback: string }> = {
  today: { key: "notifications.group_today", fallback: "Today" },
  yesterday: { key: "notifications.group_yesterday", fallback: "Yesterday" },
  this_week: { key: "notifications.group_this_week", fallback: "This Week" },
  earlier: { key: "notifications.group_earlier", fallback: "Earlier" },
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss, click } = useNotificationsCenter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const filtered = useMemo(
    () => notifications.filter((n) => matchesFilter(n, activeFilter)),
    [notifications, activeFilter]
  );

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: typeof filtered }[] = [];
    const groupMap = new Map<string, typeof filtered>();
    const order = ["today", "yesterday", "this_week", "earlier"];

    for (const notif of filtered) {
      const group = getDateGroup(notif.created_at);
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(notif);
    }

    for (const key of order) {
      const items = groupMap.get(key);
      if (items && items.length > 0) {
        const info = DATE_GROUP_LABELS[key];
        groups.push({ key, label: t(info.key) || info.fallback, items });
      }
    }
    return groups;
  }, [filtered, t]);

  const handleTap = async (notif: (typeof notifications)[0]) => {
    await click(notif.id);
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const filterCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: 0, unread: 0, wallet: 0, orbit: 0, orders: 0, booking: 0, real_estate: 0, news: 0, system: 0 };
    for (const n of notifications) {
      counts.all++;
      if (!n.read_at) counts.unread++;
      if (n.domain === "wallet") counts.wallet++;
      if (n.domain === "orbit") counts.orbit++;
      if (n.domain === "booking") counts.booking++;
      if (n.domain === "real_estate") counts.real_estate++;
      if (n.domain === "news") counts.news++;
      if (n.domain === "merchant" || n.domain === "food_delivery" || n.domain === "parcel_delivery" || n.domain === "mobility") counts.orders++;
      if (n.domain === "system" || n.domain === "admin") counts.system++;
    }
    return counts;
  }, [notifications]);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(228 28% 7%)" }}>
      <header className="px-4 pt-4 pb-3" style={{ background: "hsl(226 24% 10%)", borderBottom: "1px solid hsl(0 0% 100% / 0.05)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform border border-border/10"
              style={{ background: "hsl(226 24% 14%)" }}
            >
              <ArrowLeft className="w-4.5 h-4.5" style={{ color: "hsl(var(--accent))" }} />
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "hsl(var(--accent))" }}>
                {t("notifications.title") || "Notifications"}
              </h1>
              <p className="text-xs" style={{ color: "hsl(0 0% 100% / 0.45)" }}>
                {unreadCount > 0
                  ? `${unreadCount} ${t("notifications.unread") || "unread"}`
                  : t("notifications.all_caught_up") || "All caught up"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium active:scale-95 transition-transform"
                style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("notifications.mark_all_read") || "Mark all read"}
              </button>
            )}
            <button
              onClick={() => navigate("/settings/notifications")}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform border border-border/10"
              style={{ background: "hsl(226 24% 14%)" }}
            >
              <Settings className="w-4 h-4" style={{ color: "hsl(0 0% 100% / 0.45)" }} />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {FILTER_TABS.map(({ key, labelKey, fallback, icon: Icon }) => {
            const isActive = activeFilter === key;
            const count = key === "unread" ? filterCounts.unread : filterCounts[key];
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 active:scale-95 transition-all"
                style={{
                  background: isActive ? "hsl(var(--accent) / 0.12)" : "hsl(226 24% 12%)",
                  color: isActive ? "hsl(var(--accent))" : "hsl(0 0% 100% / 0.4)",
                  border: `1px solid ${isActive ? "hsl(var(--accent) / 0.2)" : "hsl(0 0% 100% / 0.06)"}`,
                }}
              >
                <Icon className="h-3 w-3" />
                {t(labelKey) || fallback}
                {count > 0 && key !== "all" && (
                  <span
                    className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: isActive ? "hsl(var(--accent))" : "hsl(226 24% 18%)",
                      color: isActive ? "hsl(228 28% 7%)" : "hsl(0 0% 100% / 0.4)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center py-12 gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--accent))", borderTopColor: "transparent" }} />
            <p className="text-xs" style={{ color: "hsl(0 0% 100% / 0.4)" }}>{t("notifications.loading") || "Loading..."}</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-border/5" style={{ background: "hsl(226 24% 10%)" }}>
              <BellOff className="h-7 w-7" style={{ color: "hsl(0 0% 100% / 0.2)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "hsl(0 0% 100% / 0.45)" }}>
              {activeFilter === "unread"
                ? t("notifications.no_unread") || "No unread notifications"
                : t("notifications.empty_title") || "No notifications yet"}
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(0 0% 100% / 0.25)" }}>
              {t("notifications.empty_description") || "Important updates will appear here"}
            </p>
          </div>
        )}

        {!loading && grouped.length > 0 && (
          <div className="pb-[var(--page-bottom-pad)]">
            {grouped.map(({ key: groupKey, label, items }) => (
              <div key={groupKey}>
                <div className="px-4 py-2.5 sticky top-0 z-10" style={{ background: "hsl(228 28% 7%)" }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(0 0% 100% / 0.3)" }}>
                    {label}
                  </span>
                </div>
                <div className="px-4 space-y-2">
                  <AnimatePresence>
                    {items.map((notif, i) => {
                      const Icon = DOMAIN_ICONS[notif.domain] || Bell;
                      const isUnread = !notif.read_at;
                      return (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.2, delay: i * 0.02 }}
                          className="relative group"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleTap(notif)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTap(notif); }}
                            className="w-full flex items-start gap-3 p-3.5 rounded-2xl text-left active:scale-[0.98] transition-all cursor-pointer"
                            style={{
                              background: isUnread ? "hsl(var(--accent) / 0.04)" : "hsl(226 24% 10%)",
                              border: `1px solid ${isUnread ? "hsl(var(--accent) / 0.12)" : "hsl(0 0% 100% / 0.05)"}`,
                            }}
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                background: isUnread ? "hsl(var(--accent) / 0.12)" : "hsl(226 24% 14%)",
                              }}
                            >
                              <Icon
                                className="h-4 w-4"
                                style={{ color: isUnread ? "hsl(var(--accent))" : "hsl(0 0% 100% / 0.35)" }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-semibold line-clamp-1 break-words"
                                style={{ color: isUnread ? "hsl(0 0% 100% / 0.9)" : "hsl(0 0% 100% / 0.65)" }}
                              >
                                {notif.title}
                              </p>
                              <p className="text-xs line-clamp-2 mt-0.5" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
                                {notif.body}
                              </p>
                              {notif.domain === "wallet" && notif.data?.balance != null && (
                                <p className="text-[11px] font-bold mt-1" style={{ color: "hsl(var(--accent))" }}>
                                  Balance: {notif.data.balance} {notif.data.currency || "AED"}
                                </p>
                              )}
                              <p className="text-[10px] mt-1" style={{ color: "hsl(0 0% 100% / 0.25)" }}>
                                {formatRelativeTime(notif.created_at, t)}
                              </p>
                            </div>
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              {isUnread && (
                                <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: "hsl(var(--accent))" }} />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismiss(notif.id);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 sm:hover:opacity-100 transition-opacity active:scale-90"
                                style={{ background: "hsla(0, 60%, 50%, 0.1)" }}
                                title={t("notifications.dismiss") || "Dismiss"}
                              >
                                <Trash2 className="h-3 w-3" style={{ color: "hsl(0 60% 50%)" }} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string, t: (key: string) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("notifications.time_just_now") || "Just now";
  if (diffMins < 60) return (t("notifications.time_minutes_ago") || "{n}m ago").replace("{n}", String(diffMins));
  if (diffHours < 24) return (t("notifications.time_hours_ago") || "{n}h ago").replace("{n}", String(diffHours));
  if (diffDays < 7) return (t("notifications.time_days_ago") || "{n}d ago").replace("{n}", String(diffDays));
  return date.toLocaleDateString();
}
