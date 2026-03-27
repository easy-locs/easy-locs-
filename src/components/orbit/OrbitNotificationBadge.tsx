import { useNotificationV2Store } from "@/stores/notificationV2Store";

export function OrbitNotificationBadge() {
  const count = useNotificationV2Store((s) => s.unreadCount);

  if (!count) return null;

  return (
    <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground border border-border px-1 text-[11px] font-semibold">
      {count > 99 ? "99+" : count}
    </span>
  );
}
