/**
 * NotificationBell — Premium notification center with dynamic pillar-based styling.
 * Uses shared architecture: routes.ts for target resolution, types.ts for metadata format.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Bell, MessageCircle, ExternalLink, ArrowRightLeft, AlertTriangle, Check, CheckCheck, Trash2, Filter, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt, nl, pl, tr, ja, ko, zhCN, type Locale as DfLocale } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";
import { resolveTarget, detectModule, detectPortal } from "@/lib/shared/routes";
import type { AppModule } from "@/lib/shared/types";
import { motion, AnimatePresence } from "framer-motion";

const dateFnsLocaleMap: Record<string, DfLocale> = {
  fr, en: enUS, es, de, it, pt, nl, pl, tr, ja, ko, zh: zhCN,
};

const MODULE_CONFIG: Record<AppModule, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  long_term: { label: "Property", emoji: "🏠", bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  seasonal: { label: "Seasonal", emoji: "🏖️", bg: "bg-sky-500/10", text: "text-sky-600", border: "border-sky-500/20" },
  marketplace: { label: "Marketplace", emoji: "🛍️", bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500/20" },
  real_estate: { label: "Real Estate", emoji: "🏡", bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" },
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
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const dfLocale = useMemo(() => dateFnsLocaleMap[locale] || enUS, [locale]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

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

  // Stats
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
    await supabase.from("notifications").update({ resolved: true, resolved_at: new Date().toISOString() }).in("id", readIds);
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

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: t("notif.all") || "All", count: portalNotifications.length },
    { key: "unread", label: t("notif.unread") || "Unread", count: stats.unread },
    { key: "booking", label: t("notif.bookings") || "Bookings", count: stats.bookings },
    { key: "payment", label: t("notif.payments") || "Payments", count: stats.payments },
    { key: "message", label: t("notif.messages_filter") || "Messages", count: stats.messages },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-xl hover:bg-muted transition-colors">
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
            className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-card rounded-2xl shadow-2xl border border-border z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-bold text-foreground">{t("notif.title")}</h3>
                  <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {activeRole === "tenant" ? (t("badge.tenant") || "Tenant") : (t("badge.landlord") || "Owner")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {stats.unread > 0 && (
                    <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={t("notif.mark_all_read")}>
                      <CheckCheck className="h-3.5 w-3.5 text-muted-foreground hover:text-accent" />
                    </button>
                  )}
                  {portalNotifications.some(n => n.read) && (
                    <button onClick={resolveAll} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={t("notif.clear_read") || "Clear read"}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {filters.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      activeFilter === f.key
                        ? "bg-accent text-accent-foreground border-accent shadow-sm"
                        : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {f.label}
                    {f.count > 0 && <span className="ml-1 opacity-70">{f.count}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Other portal banner */}
            {hasDualRole && otherPortalUnread > 0 && (
              <button
                onClick={() => {
                  const otherRole = activeRole === "landlord" ? "tenant" : "landlord";
                  switchRole(otherRole);
                  navigate(otherRole === "tenant" ? "/tenant" : "/dashboard");
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 bg-accent/5 border-b border-border hover:bg-accent/10 transition-colors"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs text-muted-foreground">
                  {otherPortalUnread} {t("notif.in_other_portal") || (activeRole === "landlord" ? "in tenant portal" : "in owner portal")}
                </span>
                <span className="ml-auto h-5 w-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {otherPortalUnread > 9 ? "9+" : otherPortalUnread}
                </span>
              </button>
            )}

            {/* Notification list */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("notif.empty")}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">{t("notif.empty_hint") || "Notifications will appear here"}</p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const label = getHumanActionLabel(n, t);
                  const countryCode = n.metadata_json?.country_code || null;
                  const outdated = n.metadata_json?.outdated === true;
                  const mod = detectModule(n);
                  const modCfg = mod ? MODULE_CONFIG[mod] : null;

                  return (
                    <motion.button
                      key={String(n.id)}
                      type="button"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNotificationClick(n);
                      }}
                      className={`w-full text-left px-4 py-3 transition-all cursor-pointer border-b border-border/50 last:border-0 ${
                        !n.read
                          ? "bg-accent/[0.04] hover:bg-accent/[0.08]"
                          : "hover:bg-muted/50"
                      } ${outdated ? "opacity-50 cursor-default" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon with module color */}
                        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                          modCfg ? modCfg.bg : "bg-muted"
                        }`}>
                          {outdated ? "⚪" : (TYPE_ICON[n.type] || "ℹ️")}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                            )}
                            <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"} text-foreground line-clamp-1`}>
                              {n.title}
                            </p>
                          </div>

                          {/* Module + country badges */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {modCfg && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${modCfg.bg} ${modCfg.text} border ${modCfg.border}`}>
                                {modCfg.emoji} {modCfg.label}
                              </span>
                            )}
                            {countryCode && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                {countryCode.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {n.message && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.message}</p>
                          )}

                          {outdated && (
                            <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              {t("notif.outdated") || "No longer available"}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-[10px] text-muted-foreground/50">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dfLocale })}
                            </p>
                            {label && !outdated && (
                              <span className={`flex items-center gap-1 text-[11px] font-semibold ${modCfg ? modCfg.text : "text-accent"}`}>
                                {n.type === "message" ? <MessageCircle className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                                {label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {portalNotifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
                <span className="text-[10px] text-muted-foreground/60">
                  {portalNotifications.length} {t("notif.total") || "notifications"} · {stats.unread} {t("notif.unread_label") || "unread"}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
