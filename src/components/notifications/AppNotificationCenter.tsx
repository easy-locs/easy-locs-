import { markNotificationRead, dismissNotification } from "@/lib/notifications/app-notification-service";

type Props = {
  items: any[];
  unreadCount: number;
  onReload: () => void;
};

export function AppNotificationCenter({ items, unreadCount, onReload }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {unreadCount} unread
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border p-3 ${!item.read_at ? "bg-primary/5 border-primary/20" : "bg-background"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.body}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">{item.scope} · {item.category}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {!item.read_at && (
                  <button
                    className="rounded-lg border px-2 py-1 text-[10px]"
                    onClick={async () => { await markNotificationRead(item.id); onReload(); }}
                  >
                    Read
                  </button>
                )}
                <button
                  className="rounded-lg border px-2 py-1 text-[10px]"
                  onClick={async () => { await dismissNotification(item.id); onReload(); }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No notifications</p>}
      </div>
    </div>
  );
}
