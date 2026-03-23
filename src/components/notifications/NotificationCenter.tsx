/**
 * NotificationCenter — Production notification center UI.
 * Reads from unifiedNotificationStore, supports read/unread, deep links, categories.
 * Authoritative source: `notifications` table via unifiedNotificationStore.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedNotificationStore } from "@/stores/unifiedNotificationStore";
import { resolveDeepLink } from "@/lib/notifications/deepLinks";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  Bell, BellOff, CheckCheck,
  CreditCard, MessageSquare, Phone, ShoppingBag, Building2, Shield, Zap,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  wallet: CreditCard,
  order: ShoppingBag,
  call: Phone,
  message: MessageSquare,
  rent: Building2,
  security: Shield,
  system: Zap,
  business: ShoppingBag,
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const notifications = useUnifiedNotificationStore((s) => s.notifications);
  const loading = useUnifiedNotificationStore((s) => s.loading);
  const hydrate = useUnifiedNotificationStore((s) => s.hydrate);
  const markAsRead = useUnifiedNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useUnifiedNotificationStore((s) => s.markAllAsRead);
  const unreadCount = useUnifiedNotificationStore((s) => s.unreadCount);

  useEffect(() => {
    if (user?.id) hydrate(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = unreadCount();

  const handleTap = async (notif: (typeof notifications)[0]) => {
    if (!notif.read_at) await markAsRead(notif.id);
    const route = resolveDeepLink(notif.type, notif.link);
    navigate(route);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{t("notifications.title") || "Notifications"}</h1>
            <p className="text-xs text-muted-foreground">
              {unread > 0
                ? `${unread} ${t("notifications.unread") || "unread"}`
                : t("notifications.all_caught_up") || "All caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button
            onClick={() => user?.id && store.markAllAsRead(user.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium active:scale-95 transition-transform"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notifications.mark_all_read") || "Mark all read"}
          </button>
        )}
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {store.loading && (
          <div className="space-y-3 px-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!store.loading && store.notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BellOff className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">{t("notifications.empty_title") || "No notifications yet"}</p>
            <p className="text-xs">{t("notifications.empty_description") || "Important updates will appear here"}</p>
          </div>
        )}

        {!store.loading && store.notifications.length > 0 && (
          <div className="px-4 py-3 space-y-2 pb-24">
            {store.notifications.map((notif, i) => {
              const Icon = CATEGORY_ICONS[notif.category] || Bell;
              const isUnread = !notif.read_at;
              return (
                <motion.button
                  key={notif.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  onClick={() => handleTap(notif)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-2xl text-left active:scale-[0.98] transition-all ${
                    isUnread
                      ? "bg-primary/5 border border-primary/15"
                      : "bg-card border border-border/10"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isUnread ? "bg-primary/15" : "bg-muted/50"
                  }`}>
                    <Icon className={`h-4 w-4 ${isUnread ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isUnread ? "text-foreground" : "text-foreground/80"}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
