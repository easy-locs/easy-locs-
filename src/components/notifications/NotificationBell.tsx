/**
 * NotificationBell — Premium notification bell with dropdown panel.
 * CANONICAL: Reads from notifications_v2 via useNotificationsCenter.
 * Supports filters, dual-role switching, browser push, sound, vibration.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Bell, CheckCheck, Trash2, X, CreditCard, CalendarCheck, Inbox, MessageCircle, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt, nl, pl, tr, ja, ko, zhCN } from "@/lib/date-locales";
import type { Locale as DfLocale } from "@/lib/date-locales";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotificationsCenter } from "@/hooks/useNotificationsCenter";
import type { NotificationRow } from "@/lib/notifications-v2/notification-service";

const dateFnsLocaleMap: Record<string, DfLocale> = {
  fr, en: enUS, es, de, it, pt, nl, pl, tr, ja, ko, zh: zhCN,
};

type FilterType = "all" | "unread" | "mobility" | "wallet" | "merchant";

const DOMAIN_EMOJI: Record<string, string> = {
  wallet: "💳",
  orbit: "💬",
  mobility: "🚗",
  food_delivery: "🍔",
  parcel_delivery: "📦",
  merchant: "🛒",
  admin: "🛡️",
  system: "⚡",
};

const NotificationBell = ({ onOpen }: { onOpen?: () => void } = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const isMobile = useIsMobile();
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss, click } = useNotificationsCenter();
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const dfLocale = useMemo(() => dateFnsLocaleMap[locale] || enUS, [locale]);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (bellRef.current && !isMobile) {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    justOpenedRef.current = true;
    const setupTimer = setTimeout(() => { justOpenedRef.current = false; }, 300);
    const handler = (e: Event) => {
      if (justOpenedRef.current) return;
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const panel = document.getElementById("notification-panel");
      if (panel?.contains(target)) return;
      setOpen(false);
    };
    const eventType = "ontouchstart" in window ? "touchstart" : "mousedown";
    document.addEventListener(eventType, handler, { passive: true });
    return () => { clearTimeout(setupTimer); document.removeEventListener(eventType, handler); };
  }, [open, isMobile]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (activeFilter === "unread") list = list.filter(n => !n.read_at);
    else if (activeFilter === "mobility") list = list.filter(n => n.domain === "mobility" || n.domain === "food_delivery" || n.domain === "parcel_delivery");
    else if (activeFilter === "wallet") list = list.filter(n => n.domain === "wallet");
    else if (activeFilter === "merchant") list = list.filter(n => n.domain === "merchant" || n.domain === "food_delivery");
    return list.slice(0, 20);
  }, [notifications, activeFilter]);

  const stats = useMemo(() => ({
    unread: notifications.filter(n => !n.read_at).length,
    mobility: notifications.filter(n => ["mobility", "food_delivery", "parcel_delivery"].includes(n.domain)).length,
    wallet: notifications.filter(n => n.domain === "wallet").length,
    merchant: notifications.filter(n => ["merchant", "food_delivery"].includes(n.domain)).length,
  }), [notifications]);

  const handleClick = useCallback((n: NotificationRow) => {
    void click(n.id);
    setOpen(false);
    if (n.action_url) navigate(n.action_url);
  }, [click, navigate]);

  const handleBellClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(prev => !prev);
  }, []);

  const FILTERS: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: t("notif.all") || "All", count: notifications.length },
    { key: "unread", label: t("notif.unread") || "New", count: stats.unread },
    { key: "mobility", label: t("notif.rides") || "Rides", count: stats.mobility },
    { key: "wallet", label: t("notif.payments") || "Payments", count: stats.wallet },
    { key: "merchant", label: t("notif.orders") || "Orders", count: stats.merchant },
  ];

  return (
    <div className="relative overflow-visible" ref={containerRef}>
      <button
        ref={bellRef}
        onClick={handleBellClick}
        className="relative p-2.5 rounded-xl hover:bg-muted/80 transition-all duration-200 active:scale-95"
        aria-label="Notifications"
        type="button"
      >
        <Bell className="h-5 w-5 text-foreground/70" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0.5 end-0.5 h-[18px] min-w-[18px] px-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-card pointer-events-none"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              {isMobile && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
                  onClick={() => setOpen(false)}
                />
              )}
              <motion.div
                id="notification-panel"
                initial={{ opacity: 0, y: isMobile ? 20 : -6, scale: isMobile ? 1 : 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: isMobile ? 20 : -6, scale: isMobile ? 1 : 0.97 }}
                transition={{ duration: 0.22, type: "spring", stiffness: 400, damping: 30 }}
                className={`${isMobile ? "fixed inset-x-0 bottom-0 rounded-b-none rounded-t-2xl safe-bottom" : "fixed w-[380px] rounded-2xl"} z-[9999] bg-card shadow-2xl border border-border overflow-hidden flex flex-col`}
                style={{
                  maxHeight: isMobile ? "80vh" : "520px",
                  maxWidth: isMobile ? undefined : "calc(100vw - 2rem)",
                  ...(isMobile ? {} : { top: panelPos.top, right: panelPos.right }),
                }}
              >
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-foreground tracking-tight">{t("notif.title") || "Notifications"}</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive tabular-nums">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {stats.unread > 0 && (
                        <button onClick={() => markAllAsRead()} className="p-1.5 rounded-lg hover:bg-muted transition-colors group" title={t("notif.mark_all_read") || "Mark all read"} type="button">
                          <CheckCheck className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                        </button>
                      )}
                      <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-1" type="button">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
                    {FILTERS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        type="button"
                        className={`shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
                          activeFilter === f.key
                            ? "bg-foreground text-card shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span>{f.label}</span>
                        {f.count > 0 && activeFilter !== f.key && <span className="text-[9px] opacity-60 tabular-nums">{f.count}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight: isMobile ? "60vh" : "420px", WebkitOverflowScrolling: "touch" }}>
                  {filtered.length === 0 ? (
                    <div className="py-12 px-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center ring-1 ring-border/30">
                        <Bell className="h-7 w-7 text-muted-foreground/25" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground/70">{t("notif.empty") || "All caught up"}</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {filtered.map((n, i) => (
                        <motion.button
                          key={n.id}
                          type="button"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025, duration: 0.15 }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClick(n); }}
                          className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all duration-150 border-b border-border/30 last:border-b-0 ${
                            n.read_at ? "hover:bg-muted/40 active:bg-muted/60" : "bg-accent/[0.03] hover:bg-accent/[0.06]"
                          }`}
                        >
                          <div className="relative shrink-0 mt-0.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-muted/30">
                              {DOMAIN_EMOJI[n.domain] || "📌"}
                            </div>
                            {!n.read_at && (
                              <div className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-card" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${n.read_at ? "text-foreground/70" : "text-foreground font-medium"}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                            <span className="text-[10px] text-muted-foreground/50 tabular-nums mt-1 block">
                              {(() => { try { return formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dfLocale }); } catch { return ""; } })()}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;

export { requestNotificationPermission } from "@/lib/notif-alert-prefs";
