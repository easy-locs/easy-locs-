import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Bell, MessageCircle, ExternalLink, ArrowRightLeft, AlertTriangle, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt, nl, pl, tr, ja, ko, zhCN, type Locale as DfLocale } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";

const dateFnsLocaleMap: Record<string, DfLocale> = {
  fr, en: enUS, es, de, it, pt, nl, pl, tr, ja, ko, zh: zhCN,
};

const getNotifPortal = (n: any): "tenant" | "landlord" | "both" => {
  const meta = n.metadata_json;
  const link = meta?.target_url || n.link || "";
  if (link.startsWith("/tenant")) return "tenant";
  if (link.startsWith("/dashboard")) return "landlord";
  if (n.type === "message") return "both";
  return "both";
};

const getNotifModule = (n: any): "long_term" | "seasonal" | "marketplace" | null => {
  const meta = n.metadata_json;
  const targetType = meta?.target_type || "";
  const link = meta?.target_url || n.link || "";
  if (targetType === "marketplace_booking" || targetType === "marketplace_service" || link.includes("/activities")) return "marketplace";
  if (targetType === "concierge_order" || targetType === "concierge_service" || link.includes("/concierge")) return "marketplace";
  if (targetType === "booking_request" || link.includes("/seasonal")) return "seasonal";
  if (targetType === "lease" || targetType === "tenant" || targetType === "payment" || targetType === "receipt" || targetType === "document") return "long_term";
  if (link.includes("/rental") || link.includes("/tenant/pay") || link.includes("/tenant/receipts")) return "long_term";
  return null;
};

const MODULE_LABELS: Record<string, { label: string; color: string }> = {
  long_term: { label: "🏠", color: "bg-blue-500/10 text-blue-600" },
  seasonal: { label: "🏖️", color: "bg-amber-500/10 text-amber-600" },
  marketplace: { label: "🎯", color: "bg-emerald-500/10 text-emerald-600" },
};

const TARGET_ROUTE_MAP: Record<string, { landlord: string; tenant?: string }> = {
  marketplace_booking: { landlord: "/dashboard/activities" },
  marketplace_service: { landlord: "/dashboard/activities" },
  concierge_order: { landlord: "/dashboard/concierge" },
  concierge_service: { landlord: "/dashboard/concierge" },
  booking_request: { landlord: "/dashboard/seasonal" },
  lease: { landlord: "/dashboard/leases", tenant: "/tenant/documents" },
  tenant: { landlord: "/dashboard/tenants" },
  payment: { landlord: "/dashboard/rental", tenant: "/tenant/pay" },
  receipt: { landlord: "/dashboard/receipts", tenant: "/tenant/receipts" },
  document: { landlord: "/dashboard/documents", tenant: "/tenant/documents" },
  intervention: { landlord: "/dashboard/interventions", tenant: "/tenant/requests" },
  invoice: { landlord: "/dashboard/finances" },
  dunning: { landlord: "/dashboard/dunning" },
  expense: { landlord: "/dashboard/expenses" },
  message: { landlord: "/dashboard/communication", tenant: "/tenant/messages" },
};

const TYPE_FALLBACK: Record<string, string> = {
  payment: "/dashboard/rental",
  message: "/dashboard/communication",
  document: "/dashboard/documents",
  dunning: "/dashboard/dunning",
  rent_call: "/dashboard/rental",
  request: "/dashboard/interventions",
  receipt: "/dashboard/receipts",
  info: "/dashboard",
};

function resolveNotificationTarget(n: any, activeRole: string): string {
  const meta = n.metadata_json;

  if (meta?.target_url) {
    let url = meta.target_url as string;
    if (activeRole === "tenant" && meta.target_type) {
      const routeInfo = TARGET_ROUTE_MAP[meta.target_type as string];
      if (routeInfo?.tenant) {
        const [, qs] = url.split("?");
        url = qs ? `${routeInfo.tenant}?${qs}` : routeInfo.tenant;
      }
    }
    if (meta.country_code && !url.includes("country=")) {
      url += (url.includes("?") ? "&" : "?") + `country=${meta.country_code}`;
    }
    return url;
  }

  if (meta?.target_type) {
    const routeInfo = TARGET_ROUTE_MAP[meta.target_type as string];
    if (routeInfo) {
      const basePath = activeRole === "tenant" && routeInfo.tenant
        ? routeInfo.tenant
        : routeInfo.landlord;
      const params = new URLSearchParams();
      if (meta.country_code) params.set("country", meta.country_code as string);
      if (meta.target_id) params.set("record", meta.target_id as string);
      if (meta.booking_id) params.set("booking", meta.booking_id as string);
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
    }
  }

  if (n.link) return n.link;

  return TYPE_FALLBACK[n.type] || "/dashboard";
}

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

const NotificationBell = () => {
  const { user, activeRole, hasDualRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dfLocale = useMemo(() => dateFnsLocaleMap[locale] || enUS, [locale]);

  // Close dropdown on outside click using ref — no backdrop overlay needed
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

  // Active notifications = not resolved, filtered by portal
  const notifications = useMemo(() => {
    return allNotifications
      .filter((n) => !(n as any).resolved)
      .filter((n) => {
        const portal = getNotifPortal(n);
        return portal === "both" || portal === activeRole;
      })
      .slice(0, 20);
  }, [allNotifications, activeRole]);

  const otherPortalUnread = useMemo(() => {
    if (!hasDualRole) return 0;
    const otherRole = activeRole === "landlord" ? "tenant" : "landlord";
    return allNotifications.filter((n) => {
      const portal = getNotifPortal(n);
      return !n.read && !(n as any).resolved && portal === otherRole;
    }).length;
  }, [allNotifications, activeRole, hasDualRole]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    const currentIds = notifications.filter(n => !n.read).map(n => n.id);
    if (currentIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", currentIds);
    setAllNotifications((prev) => prev.map((n) => currentIds.includes(n.id) ? { ...n, read: true } : n));
  };

  /** Resolve a notification — marks as resolved and removes from active list */
  const resolveNotification = useCallback(async (notifId: string) => {
    // Optimistic UI removal
    setAllNotifications((prev) =>
      prev.map((n) => String(n.id) === String(notifId)
        ? { ...n, resolved: true, resolved_at: new Date().toISOString() }
        : n
      )
    );
    // Persist
    await supabase
      .from("notifications")
      .update({ resolved: true, resolved_at: new Date().toISOString(), read: true } as any)
      .eq("id", notifId);
  }, []);

  

  /** Core click handler — each notification resolves its own unique target */
  const handleNotificationClick = useCallback((e: React.MouseEvent, n: any) => {
    // Stop propagation so the backdrop overlay doesn't intercept
    e.stopPropagation();
    e.preventDefault();

    const outdated = n.metadata_json?.outdated === true;
    if (outdated) return;

    // Resolve the target from THIS notification's own metadata — fully isolated
    const notifId = String(n.id);
    const target = resolveNotificationTarget(n, activeRole);
    console.log("[notif] click:", notifId, "target:", target, "title:", n.title);

    // 1. Mark as resolved (removes from active list)
    resolveNotification(notifId);

    // 2. Close dropdown
    setOpen(false);

    // 3. Auto-switch role if needed then navigate
    const isTenantLink = target.startsWith("/tenant");
    const isLandlordLink = target.startsWith("/dashboard");
    const needsSwitch = hasDualRole && (
      (isTenantLink && activeRole !== "tenant") ||
      (isLandlordLink && activeRole !== "landlord")
    );

    if (needsSwitch) {
      const newRole = isTenantLink ? "tenant" : "landlord";
      console.log("[notif] switching role to:", newRole, "then navigating to:", target);
      switchRole(newRole);
      setTimeout(() => { console.log("[notif] navigate (after switch):", target); navigate(target, { replace: false }); }, 300);
    } else {
      console.log("[notif] navigating to:", target);
      setTimeout(() => { console.log("[notif] navigate fired:", target); navigate(target, { replace: false }); }, 50);
    }
  }, [activeRole, hasDualRole, switchRole, navigate, resolveNotification]);

  const typeIcon: Record<string, string> = {
    payment: "💳", message: "💬", dunning: "⚠️", rent_call: "🏠",
    document: "📄", request: "📋", info: "ℹ️", receipt: "🧾",
  };

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{t("notif.title")}</h3>
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                  {activeRole === "tenant" ? (t("badge.tenant") || "Locataire") : (t("badge.landlord") || "Bailleur")}
                </span>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-accent hover:underline">{t("notif.mark_all_read")}</button>
              )}
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
                className="w-full flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border hover:bg-muted transition-colors"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs text-muted-foreground">
                  {otherPortalUnread} {t("notif.in_other_portal") || (activeRole === "landlord" ? "notification(s) côté locataire" : "notification(s) côté bailleur")}
                </span>
                <span className="ml-auto h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {otherPortalUnread > 9 ? "9+" : otherPortalUnread}
                </span>
              </button>
            )}

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{t("notif.empty")}</div>
              ) : (
                notifications.map((n) => {
                  const label = getHumanActionLabel(n, t);
                  const countryCode = n.metadata_json?.country_code || null;
                  const outdated = n.metadata_json?.outdated === true;
                  const mod = getNotifModule(n);

                  return (
                    <button
                      type="button"
                      key={n.id}
                      aria-label={n.title}
                      onClick={(e) => handleNotificationClick(e, n)}
                      className={[
                        "w-full text-left px-4 py-3 transition-colors cursor-pointer select-none",
                        "hover:bg-muted/50 active:bg-muted/70",
                        "touch-manipulation border-0 bg-transparent",
                        !n.read ? "bg-accent/5" : "",
                        outdated ? "opacity-60 cursor-default" : "",
                      ].filter(Boolean).join(" ")}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div className="flex items-start gap-2.5 pointer-events-none">
                        <span className="text-base mt-0.5">{outdated ? "⚪" : (typeIcon[n.type] || "ℹ️")}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"} text-foreground truncate`}>{n.title}</p>
                            {mod && (
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${MODULE_LABELS[mod].color}`}>{MODULE_LABELS[mod].label}</span>
                            )}
                            {countryCode && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                {countryCode}
                              </span>
                            )}
                          </div>
                          {n.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>}

                          {outdated && (
                            <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              {t("notif.outdated") || "This record is no longer available"}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dfLocale })}
                            </p>
                            {label && !outdated && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-accent">
                                {n.type === "message" ? <MessageCircle className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                                {label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
      )}
    </div>
  );
};

export default NotificationBell;
