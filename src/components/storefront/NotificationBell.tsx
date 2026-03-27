/**
 * NotificationBell — Connected to canonical notification_v2 store.
 * Shows real unread count from Orbit/payment/system notifications.
 * Listens to platformBus NOTIFICATIONS_REFRESH for cross-module sync.
 */
import { Bell, BellDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationV2Store } from "@/stores/notificationV2Store";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { haptic } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

interface Props {
  onOpen?: () => void;
}

export default function NotificationBell({ onOpen }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useNotificationV2Store((s) => s.unreadCount);
  const hydrated = useNotificationV2Store((s) => s.hydrated);
  const hydrate = useNotificationV2Store((s) => s.hydrate);
  const startRealtime = useNotificationV2Store((s) => s.startRealtime);
  const stopRealtime = useNotificationV2Store((s) => s.stopRealtime);

  useEffect(() => {
    if (!user?.id) return;
    if (!hydrated) hydrate(user.id);
    startRealtime(user.id);

    // Cross-module sync: wallet/orbit/marketplace events trigger notification rehydrate
    const unsub = platformBus.on(APP_EVENTS.NOTIFICATIONS_REFRESH, () => {
      hydrate(user.id);
    });

    return () => {
      stopRealtime();
      unsub();
    };
  }, [user?.id]);

  const handleClick = () => {
    haptic("light");
    if (onOpen) {
      onOpen();
    } else {
      navigate("/notifications");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8"
      onClick={handleClick}
    >
      {unreadCount > 0 ? (
        <>
          <BellDot className="h-4 w-4 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </>
      ) : (
        <Bell className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
