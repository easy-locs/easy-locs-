import { useNotificationsStore } from "@/stores/notificationsStore";

export function NotificationsPanel() {
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-3 ${
              item.read ? "border-border bg-background" : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              {!item.read ? (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => void markRead(item.id)}
                >
                  Mark read
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Read</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{item.body}</p>
            <p className="text-[10px] text-muted-foreground">{item.createdAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
