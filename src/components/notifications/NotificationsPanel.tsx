/**
 * NotificationsPanel — lightweight inline notification list.
 * Reads from notifications_v2 via canonical hook.
 */
import { useNotificationsCenter } from "@/hooks/useNotificationsCenter";

export function NotificationsPanel() {
  const { notifications, markAsRead } = useNotificationsCenter();

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
      <div className="space-y-1">
        {notifications.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No notifications yet</p>
        )}
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-3 ${
              item.read_at ? "border-border bg-background" : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              {!item.read_at ? (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => void markAsRead(item.id)}
                >
                  Mark read
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Read</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{item.body}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
