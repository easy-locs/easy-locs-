import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export function OrbitUnreadBadge() {
  const { unreadCount } = useUnreadMessages();

  if (!unreadCount) return null;

  return (
    <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary text-primary-foreground border border-border px-1 text-[11px] font-semibold">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
