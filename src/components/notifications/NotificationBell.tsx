import { useState, useEffect, useCallback, useMemo } from "react";
import { Bell, MessageCircle, ExternalLink, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt, nl, pl, tr, ja, ko, zhCN, type Locale as DfLocale } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";

const dateFnsLocaleMap: Record<string, DfLocale> = {
  fr, en: enUS, es, de, it, pt, nl, pl, tr, ja, ko, zh: zhCN,
};

/** Determine which portal a notification belongs to based on its link */
const getNotifPortal = (n: any): "tenant" | "landlord" | "both" => {
  const link = n.link || "";
  if (link.startsWith("/tenant")) return "tenant";
  if (link.startsWith("/dashboard")) return "landlord";
  // Messages without explicit link — infer from type
  if (n.type === "message") return "both";
  // Generic notifications (no link) show in both
  return "both";
};

const NotificationBell = () => {
  const { user, activeRole, hasDualRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const dfLocale = useMemo(() => dateFnsLocaleMap[locale] || enUS, [locale]);

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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  // Filter notifications for the current active role
  const notifications = useMemo(() => {
    return allNotifications.filter((n) => {
      const portal = getNotifPortal(n);
      if (portal === "both") return true;
      return portal === activeRole;
    }).slice(0, 20);
  }, [allNotifications, activeRole]);

  // Count unread in the OTHER portal for cross-portal badge
  const otherPortalUnread = useMemo(() => {
    if (!hasDualRole) return 0;
    const otherRole = activeRole === "landlord" ? "tenant" : "landlord";
    return allNotifications.filter((n) => {
      const portal = getNotifPortal(n);
      return !n.read && (portal === otherRole);
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

  const markRead = (n: any) => {
    supabase.from("notifications").update({ read: true }).eq("id", n.id).then(() => {});
    setAllNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
  };

  const handleAction = (n: any) => {
    markRead(n);
    setOpen(false);
    const target = n.link || (n.type === "message" ? (activeRole === "tenant" ? "/tenant/messages" : "/dashboard/communication") : null);
    if (!target) return;

    // Auto-switch role if notification targets the other portal
    const isTenantLink = target.startsWith("/tenant");
    const isLandlordLink = target.startsWith("/dashboard");
    if (hasDualRole) {
      if (isTenantLink && activeRole !== "tenant") switchRole("tenant");
      else if (isLandlordLink && activeRole !== "landlord") switchRole("landlord");
    }
    navigate(target);
  };

  const typeIcon: Record<string, string> = {
    payment: "💳", message: "💬", dunning: "⚠️", rent_call: "🏠",
    document: "📄", request: "📋", info: "ℹ️", receipt: "🧾",
  };

  const getActionLabel = (n: any): string | null => {
    if (n.type === "message") return t("notif.reply");
    if (n.type === "document") return t("notif.view_document");
    if (n.type === "payment") return t("notif.view_payment");
    if (n.type === "dunning") return t("notif.view_dunning");
    if (n.type === "receipt") return t("notif.view_document");
    if (n.type === "request") return t("notif.view_document");
    if (n.link) return t("notif.open");
    return null;
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden">
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

            {/* Cross-portal unread indicator */}
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

            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{t("notif.empty")}</div>
              ) : (
                notifications.map((n) => {
                  const label = getActionLabel(n);
                  return (
                    <div key={n.id} className={`px-4 py-3 hover:bg-muted/50 transition-colors ${!n.read ? "bg-accent/5" : ""}`}>
                      <div className="flex items-start gap-2.5">
                        <span className="text-base mt-0.5">{typeIcon[n.type] || "ℹ️"}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"} text-foreground truncate`}>{n.title}</p>
                          {n.message && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>}

                          <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dfLocale })}
                            </p>
                            {label && (
                              <button onClick={() => handleAction(n)} className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline">
                                {n.type === "message" ? <MessageCircle className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                                {label}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
