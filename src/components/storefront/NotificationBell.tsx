/**
 * NotificationBell — PASS122: Inline bell with unread badge.
 * Auto-subscribes to realtime notifications. Zero config.
 */
import { Bell, BellDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStorefrontNotifications } from "@/hooks/useStorefrontNotifications";
import { haptic } from "@/lib/haptics";

interface Props {
  shopId?: string;
  onOpen?: () => void;
}

export default function NotificationBell({ shopId, onOpen }: Props) {
  const { unreadCount, markAllRead } = useStorefrontNotifications(shopId);

  const handleClick = () => {
    haptic("light");
    if (unreadCount > 0) markAllRead();
    onOpen?.();
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
