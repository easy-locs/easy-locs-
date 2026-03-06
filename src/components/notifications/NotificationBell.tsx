import { useState, useEffect, useCallback, useMemo } from "react";
import { Bell, MessageCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt, nl, pl, tr, ja, ko, zhCN, type Locale as DfLocale } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";

const dateFnsLocaleMap: Record<string, DfLocale> = {
  fr, en: enUS, es, de, it, pt, nl, pl, tr, ja, ko, zh: zhCN,
};

const NotificationBell = () => {
  const { user, activeRole, hasDualRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const dfLocale = useMemo(() => dateFnsLocaleMap[locale] || enUS, [locale]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
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

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (n: any) => {
    supabase.from("notifications").update({ read: true }).eq("id", n.id).then(() => {});
    setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
  };



  const handleAction = (n: any) => {
    markRead(n);
    setOpen(false);
    const target = n.link || (n.type === "message" ? (activeRole === "tenant" ? "/tenant/messages" : "/dashboard/messages") : null);
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
    document: "📄", request: "📋", info: "ℹ️",
  };

  const getActionLabel = (n: any): string | null => {
    if (n.type === "message") return t("notif.reply");
    if (n.type === "document") return t("notif.view_document");
    if (n.type === "payment") return t("notif.view_payment");
    if (n.type === "dunning") return t("notif.view_dunning");
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
              <h3 className="text-sm font-semibold text-foreground">{t("notif.title")}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-accent hover:underline">{t("notif.mark_all_read")}</button>
              )}
            </div>
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
