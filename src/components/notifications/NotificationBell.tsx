/**
 * NotificationBell — Premium notification center.
 * Uses shared architecture: routes.ts for target resolution, types.ts for metadata format.
 * Fixed for iPhone Safari: uses touchend-safe event handling.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { Bell, MessageCircle, ExternalLink, ArrowRightLeft, AlertTriangle, CheckCheck, Trash2, X, CreditCard, CalendarCheck, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt, nl, pl, tr, ja, ko, zhCN } from "@/lib/date-locales";
import type { Locale as DfLocale } from "@/lib/date-locales";
import { useI18n } from "@/lib/i18n";
import { resolveTarget, detectModule, detectPortal } from "@/lib/shared/routes";
import type { AppModule } from "@/lib/shared/types";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { getNotifAlertPrefs, resolveNotifCategory, type NotifAlertPrefs } from "@/lib/notif-alert-prefs";

const dateFnsLocaleMap: Record<string, DfLocale> = {
  fr, en: enUS, es, de, it, pt, nl, pl, tr, ja, ko, zh: zhCN,
};

const MODULE_ACCENT: Record<AppModule, { dot: string; bg: string }> = {
  long_term: { dot: "bg-primary", bg: "bg-primary/8" },
  seasonal: { dot: "bg-sky-500", bg: "bg-sky-500/8" },
  marketplace: { dot: "bg-violet-500", bg: "bg-violet-500/8" },
  real_estate: { dot: "bg-emerald-500", bg: "bg-emerald-500/8" },
};

type FilterType = "all" | "unread" | "payment" | "message" | "booking";

function getHumanActionLabel(n: any, t: (k: string) => string): string | null {
  const meta = n.metadata_json;
  const targetType = (meta?.target_type || "") as string;
  const labelMap: Record<string, string> = {
    marketplace_booking: t("notif.view_booking") || "View booking",
    concierge_order: t("notif.view_booking") || "View booking",
    booking_request: t("notif.view_booking") || "View booking",
    lease: t("notif.view_document") || "View document",
    document: t("notif.view_document") || "View document",
    payment: t("notif.view_payment") || "View payment",
    receipt: t("notif.view_document") || "View document",
    intervention: t("notif.open") || "Open",
    invoice: t("notif.view_payment") || "View payment",
    dunning: t("notif.view_dunning") || "View reminder",
    message: t("notif.reply") || "Reply",
  };
  if (targetType && labelMap[targetType]) return labelMap[targetType];
  if (n.type === "message") return labelMap.message;
  if (n.type === "document") return labelMap.document;
  if (n.type === "payment") return labelMap.payment;
  if (n.type === "dunning") return labelMap.dunning;
  if (n.type === "receipt") return labelMap.receipt;
  if (n.type === "request") return labelMap.intervention;
  if (n.link || meta?.target_url) return t("notif.open") || "Open";
  return null;
}

const TYPE_ICON: Record<string, string> = {
  payment: "💳", message: "💬", dunning: "⚠️", rent_call: "🏠",
  document: "📄", request: "📋", info: "ℹ️", receipt: "🧾",
};

const NotificationBell = () => {
  const { user, activeRole, hasDualRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const isMobile = useIsMobile();
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const dfLocale = useMemo(() => dateFnsLocaleMap[locale] || enUS, [locale]);
  // Track if we just opened to prevent immediate close on iOS
  const justOpenedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    // Calculate panel position from bell button
    if (bellRef.current && !isMobile) {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    // Delay adding the outside-click handler to prevent iOS touch race
    justOpenedRef.current = true;
    const setupTimer = setTimeout(() => {
      justOpenedRef.current = false;
    }, 300);

    const handler = (e: Event) => {
      if (justOpenedRef.current) return;
      const target = e.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) return;
      const panel = document.getElementById("notification-panel");
      if (panel && panel.contains(target)) return;
      setOpen(false);
    };

    // Use mousedown on desktop, touchstart on mobile — more reliable than pointerdown on iOS Safari
    const eventType = "ontouchstart" in window ? "touchstart" : "mousedown";
    document.addEventListener(eventType, handler, { passive: true });
    return () => {
      clearTimeout(setupTimer);
      document.removeEventListener(eventType, handler);
    };
  }, [open, isMobile]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setAllNotifications(data || []);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Do NOT request notification permission on mount — wait for meaningful user action
  // Permission is requested via requestNotificationPermission() from notif-alert-prefs.ts

  // Smart sound/vibration: throttle, suppress, and respect user preferences
  const lastSoundRef = useRef(0);
  const pendingCountRef = useRef(0);
  const groupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  // Listen to pref changes
  const alertPrefsRef = useRef<NotifAlertPrefs>(getNotifAlertPrefs());
  useEffect(() => {
    const handler = (e: Event) => {
      alertPrefsRef.current = (e as CustomEvent).detail;
    };
    window.addEventListener("notif-prefs-changed", handler);
    return () => window.removeEventListener("notif-prefs-changed", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        fetchNotifications();

        const n = payload.new as any;
        const now = Date.now();
        const THROTTLE_MS = 5000;
        const prefs = alertPrefsRef.current;

        // Check per-type alert setting
        const notifCategory = resolveNotifCategory(n);
        const typeEnabled = prefs.typeAlerts?.[notifCategory] ?? true;

        const targetUrl = n.metadata_json?.target_url || n.link || "";
        const isViewingRelated = targetUrl && location.pathname && targetUrl.startsWith(location.pathname);
        const shouldAlert = typeEnabled && !isViewingRelated && !open && (now - lastSoundRef.current > THROTTLE_MS);

        try {
          if (shouldAlert) {
            lastSoundRef.current = now;

            // Vibration — only if user enabled
            if (prefs.vibration && "vibrate" in navigator) {
              navigator.vibrate([150, 80, 150]);
            }

            // Sound — only if user enabled
            if (prefs.sound) {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgipGJdFZQb5mwsI1hNTRfkJqPdFJNc5+0s5VjMy9ikJuQclBMd6O4t5tlMC1mlZ+TbkpHeqe8u6FoLylpmqOXa0RCfay/waRtLCVrnqibb0BAf7DDxKhxKh5voKueclw5gbbIyq55IRZxobGjfVg0h7zNza+CIxF0pLingl4vjcHP0LSOJw1xp7mtiVcsj8bS0rqYLAhyqr2xkFIpk8vV1MChMwNyq8C2mEwjlc/Z18awOwByq8K5n0YclNPc2s6/PwByrsW9pkIVk9fg3NbKRQBwsMnDq0EQkd3l4OLRTQBwsc3IrkMNj+Dr5erbVABusc/Os0gJi+Xx6/TlYQBqs9LTuU0Fh+j39fzsfwBltNfa");
              audio.volume = 0.25;
              audio.play().catch(() => {});
            }
          }

          // Browser notification — group multiple arriving within 2s
          if (typeEnabled && prefs.browserNotifications && "Notification" in window && Notification.permission === "granted") {
            pendingCountRef.current += 1;
            if (groupTimerRef.current) clearTimeout(groupTimerRef.current);
            groupTimerRef.current = setTimeout(() => {
              const count = pendingCountRef.current;
              pendingCountRef.current = 0;
              if (count === 1) {
                new Notification("Easy-Locs", {
                  body: n.message || n.title || "New notification",
                  icon: "/pwa-192x192.png",
                  tag: n.id,
                  silent: !shouldAlert || !prefs.sound,
                });
              } else {
                new Notification("Easy-Locs", {
                  body: `${count} new notifications`,
                  icon: "/pwa-192x192.png",
                  tag: "grouped",
                  silent: !shouldAlert || !prefs.sound,
                });
              }
            }, 2000);
          }
        } catch { /* ignore notification errors */ }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications, open, location.pathname]);

  const portalNotifications = useMemo(() => {
    return allNotifications
      .filter((n) => !(n as any).resolved)
      .filter((n) => {
        const portal = detectPortal(n);
        return portal === "both" || portal === activeRole;
      })
      .slice(0, 30);
  }, [allNotifications, activeRole]);

  const notifications = useMemo(() => {
    if (activeFilter === "all") return portalNotifications.slice(0, 20);
    if (activeFilter === "unread") return portalNotifications.filter(n => !n.read).slice(0, 20);
    if (activeFilter === "payment") return portalNotifications.filter(n => n.type === "payment" || n.type === "receipt").slice(0, 20);
    if (activeFilter === "message") return portalNotifications.filter(n => n.type === "message").slice(0, 20);
    if (activeFilter === "booking") return portalNotifications.filter(n => {
      const tt = n.metadata_json?.target_type || "";
      return ["booking_request", "marketplace_booking", "concierge_order"].includes(tt);
    }).slice(0, 20);
    return portalNotifications.slice(0, 20);
  }, [portalNotifications, activeFilter]);

  const otherPortalUnread = useMemo(() => {
    if (!hasDualRole) return 0;
    const otherRole = activeRole === "landlord" ? "tenant" : "landlord";
    return allNotifications.filter((n) => {
      const portal = detectPortal(n);
      return !n.read && !(n as any).resolved && portal === otherRole;
    }).length;
  }, [allNotifications, activeRole, hasDualRole]);

  const unreadCount = portalNotifications.filter((n) => !n.read).length;

  const stats = useMemo(() => ({
    unread: portalNotifications.filter(n => !n.read).length,
    payments: portalNotifications.filter(n => n.type === "payment" || n.type === "receipt").length,
    messages: portalNotifications.filter(n => n.type === "message").length,
    bookings: portalNotifications.filter(n => {
      const tt = n.metadata_json?.target_type || "";
      return ["booking_request", "marketplace_booking", "concierge_order"].includes(tt);
    }).length,
  }), [portalNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    const currentIds = portalNotifications.filter(n => !n.read).map(n => n.id);
    if (currentIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", currentIds);
    setAllNotifications((prev) => prev.map((n) => currentIds.includes(n.id) ? { ...n, read: true } : n));
  };

  const resolveAll = async () => {
    if (!user) return;
    const readIds = portalNotifications.filter(n => n.read).map(n => n.id);
    if (readIds.length === 0) return;
    await supabase.from("notifications").update({ resolved: true, resolved_at: new Date().toISOString() } as any).in("id", readIds);
    setAllNotifications((prev) => prev.map((n) => readIds.includes(n.id) ? { ...n, resolved: true } : n));
  };

  const handleNotificationClick = useCallback((n: any) => {
    if (n.metadata_json?.outdated === true) return;
    const notifId = String(n.id);
    const target = resolveTarget(n, activeRole);
    setAllNotifications((prev) =>
      prev.map((x) => String(x.id) === notifId ? { ...x, read: true } : x)
    );
    supabase.from("notifications").update({ read: true }).eq("id", notifId).then(() => {});
    setOpen(false);
    const isTenantLink = target.startsWith("/tenant");
    const isLandlordLink = target.startsWith("/dashboard");
    const needsSwitch = hasDualRole && (
      (isTenantLink && activeRole !== "tenant") ||
      (isLandlordLink && activeRole !== "landlord")
    );
    if (needsSwitch) {
      const newRole = isTenantLink ? "tenant" : "landlord";
      switchRole(newRole);
      setTimeout(() => navigate(target), 300);
    } else {
      navigate(target);
    }
  }, [activeRole, hasDualRole, switchRole, navigate]);

  const FILTERS: { key: FilterType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "all", label: t("notif.all") || "All", icon: <Inbox className="h-3 w-3" />, count: portalNotifications.length },
    { key: "unread", label: t("notif.unread") || "New", icon: <Bell className="h-3 w-3" />, count: stats.unread },
    { key: "booking", label: t("notif.bookings") || "Bookings", icon: <CalendarCheck className="h-3 w-3" />, count: stats.bookings },
    { key: "payment", label: t("notif.payments") || "Payments", icon: <CreditCard className="h-3 w-3" />, count: stats.payments },
    { key: "message", label: t("notif.messages_filter") || "Messages", icon: <MessageCircle className="h-3 w-3" />, count: stats.messages },
  ];

  const handleBellClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setOpen(prev => !prev);
  }, []);

  return (
    <div className="relative overflow-visible" ref={containerRef}>
      {/* Bell trigger */}
      <button
        ref={bellRef}
        onClick={handleBellClick}
        className="relative p-2.5 rounded-xl hover:bg-muted/80 transition-all duration-200 active:scale-95"
        style={{ overflow: "visible" }}
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
              {/* Mobile backdrop */}
              {isMobile && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
                className={`${
                  isMobile
                    ? "fixed inset-x-0 bottom-0 rounded-b-none rounded-t-2xl safe-bottom"
                    : "fixed w-[380px] rounded-2xl"
                } z-[9999] bg-card shadow-2xl border border-border overflow-hidden flex flex-col`}
                style={{
                  maxHeight: isMobile ? "80vh" : "520px",
                  maxWidth: isMobile ? undefined : "calc(100vw - 2rem)",
                  ...(isMobile ? {} : { top: panelPos.top, right: panelPos.right }),
                }}
              >
                {/* ─── Header ─── */}
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
                        <button
                          onClick={markAllRead}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors group"
                          title={t("notif.mark_all_read") || "Mark all read"}
                          type="button"
                        >
                          <CheckCheck className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                        </button>
                      )}
                      {portalNotifications.some(n => n.read) && (
                        <button
                          onClick={resolveAll}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors group"
                          title={t("notif.clear_read") || "Clear read"}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                        </button>
                      )}
                      <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-1"
                        type="button"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Filter tabs */}
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
                        {f.icon}
                        <span>{f.label}</span>
                        {f.count > 0 && activeFilter !== f.key && (
                          <span className="text-[9px] opacity-60 tabular-nums">{f.count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── Portal switch banner ─── */}
                {hasDualRole && otherPortalUnread > 0 && (
                  <button
                    onClick={() => {
                      const otherRole = activeRole === "landlord" ? "tenant" : "landlord";
                      switchRole(otherRole);
                      navigate(otherRole === "tenant" ? "/tenant" : "/dashboard");
                      setOpen(false);
                    }}
                    type="button"
                    className="flex items-center gap-2.5 px-4 py-2 bg-accent/5 hover:bg-accent/10 border-b border-border/60 transition-colors"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
                    <span className="text-xs text-muted-foreground flex-1 text-left">
                      {otherPortalUnread} {t("notif.in_other_portal") || (activeRole === "landlord" ? "in tenant portal" : "in owner portal")}
                    </span>
                    <span className="h-5 min-w-[20px] px-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {otherPortalUnread > 9 ? "9+" : otherPortalUnread}
                    </span>
                  </button>
                )}

                {/* ─── Notification list ─── */}
                <div className="flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight: isMobile ? "60vh" : "420px", WebkitOverflowScrolling: "touch" }}>
                  {notifications.length === 0 ? (
                    <div className="py-12 px-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center ring-1 ring-border/30">
                        <Bell className="h-7 w-7 text-muted-foreground/25" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground/70">{t("notif.empty") || "All caught up"}</p>
                      <p className="text-[11px] text-muted-foreground/40 mt-1">{t("notif.empty_hint") || "Notifications will appear here"}</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {notifications.map((n, i) => {
                        const label = getHumanActionLabel(n, t);
                        const outdated = n.metadata_json?.outdated === true;
                        const mod = detectModule(n);
                        const modAccent = mod ? MODULE_ACCENT[mod] : null;

                        return (
                          <motion.button
                            key={String(n.id)}
                            type="button"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.025, duration: 0.15 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleNotificationClick(n);
                            }}
                            disabled={outdated}
                            className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all duration-150 border-b border-border/30 last:border-b-0 ${
                              outdated
                                ? "opacity-40 cursor-not-allowed"
                                : n.read
                                ? "hover:bg-muted/40 active:bg-muted/60"
                                : "bg-accent/[0.03] hover:bg-accent/[0.06] active:bg-accent/[0.1]"
                            }`}
                          >
                            {/* Type icon + module dot */}
                            <div className="relative shrink-0 mt-0.5">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${modAccent?.bg || "bg-muted/30"}`}>
                                {TYPE_ICON[n.type] || "📌"}
                              </div>
                              {modAccent && (
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${modAccent.dot} ring-2 ring-card`} />
                              )}
                              {!n.read && (
                                <div className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-card" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${n.read ? "text-foreground/70" : "text-foreground font-medium"}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                                  {(() => {
                                    try {
                                      return formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dfLocale });
                                    } catch {
                                      return "";
                                    }
                                  })()}
                                </span>
                                {label && !outdated && (
                                  <span className="text-[10px] font-semibold text-accent flex items-center gap-1">
                                    {label} <ExternalLink className="h-2.5 w-2.5" />
                                  </span>
                                )}
                                {outdated && (
                                  <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                                    <AlertTriangle className="h-2.5 w-2.5" /> {t("notif.outdated") || "Outdated"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
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

// Re-export from centralized module for backward compatibility
export { requestNotificationPermission } from "@/lib/notif-alert-prefs";
