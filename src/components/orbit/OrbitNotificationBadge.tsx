import { useNotificationBellSync } from "@/hooks/useNotificationBellSync";

export function OrbitNotificationBadge() {
  const { notificationCount } = useNotificationBellSync();

  if (!notificationCount) return null;

  return (
    <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground border border-border px-1 text-[11px] font-semibold">
      {notificationCount > 99 ? "99+" : notificationCount}
    </span>
  );
}
