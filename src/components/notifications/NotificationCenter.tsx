/**
 * NotificationCenter — Canonical notification center UI.
 * Reads ONLY from notifications_v2 via useNotificationsCenter hook.
 */
import { useNavigate } from "react-router-dom";
import { useNotificationsCenter } from "@/hooks/useNotificationsCenter";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  Bell, BellOff, CheckCheck,
  CreditCard, MessageSquare, Phone, ShoppingBag, Truck, Shield, Zap, MapPin,
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
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, click } = useNotificationsCenter();

  const handleTap = async (notif: (typeof notifications)[0]) => {
    await click(notif.id);
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{t("notifications.title") || "Notifications"}</h1>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} ${t("notifications.unread") || "unread"}`
                : t("notifications.all_caught_up") || "All caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium active:scale-95 transition-transform"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notifications.mark_all_read") || "Mark all read"}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="min-h-[48px]" />
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BellOff className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">{t("notifications.empty_title") || "No notifications yet"}</p>
            <p className="text-xs">{t("notifications.empty_description") || "Important updates will appear here"}</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="px-4 py-3 space-y-2 pb-24">
            {notifications.map((notif, i) => {
              const Icon = DOMAIN_ICONS[notif.domain] || Bell;
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
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.body}</p>
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
