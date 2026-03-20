import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  listNotificationQueue,
  markNotificationStatus,
  triggerOrderUpdateNotifications,
} from "@/lib/notifications/notificationEngine";
import { toast } from "sonner";

export default function AdminNotificationEnginePage() {
  const navigate = useNavigate();

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-notification-engine"],
    queryFn: () => listNotificationQueue(100),
    staleTime: 5000,
  });

  const runOrderNotifications = async () => {
    try {
      const res = await triggerOrderUpdateNotifications(40);
      const ok = res.filter((r) => r.ok).length;
      toast.success(`Queued ${ok} order notifications`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Notification run failed");
    }
  };

  const setStatus = async (id: string, status: "pending" | "sent" | "failed") => {
    try {
      await markNotificationStatus({ notificationId: id, status });
      toast.success(`Marked ${status}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Status update failed");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Notification Engine</h1>
          <p className="text-xs text-muted-foreground">
            Queue, delivery status and action triggers
          </p>
        </div>
      </div>

      <button
        onClick={runOrderNotifications}
        className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Trigger Order Update Notifications
      </button>

      {isLoading &&
        [1, 2, 3].map((i) => (
          <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
        ))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No notifications yet
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{row.template_key}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.channel} · {row.actor_type} ·{" "}
                    {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {row.status}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStatus(row.id, "pending")}
                  className="rounded-xl bg-muted px-3 py-2 text-xs font-bold"
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatus(row.id, "sent")}
                  className="rounded-xl bg-primary/10 text-primary px-3 py-2 text-xs font-bold"
                >
                  Sent
                </button>
                <button
                  onClick={() => setStatus(row.id, "failed")}
                  className="rounded-xl bg-destructive/10 text-destructive px-3 py-2 text-xs font-bold"
                >
                  Failed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
