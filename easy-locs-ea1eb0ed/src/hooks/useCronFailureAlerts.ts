import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { toast } from "sonner";

interface CronFailureNotification {
  id: string;
  user_id: string;
  scope: string;
  category: string;
  title: string;
  body: string;
  severity: string;
  route: string | null;
  metadata: {
    actor: string;
    domain: string;
    data?: {
      job_name?: string;
      error_message?: string | null;
      log_id?: string;
      started_at?: string;
      finished_at?: string | null;
      duration_ms?: number | null;
    };
  };
}

export function useCronFailureAlerts(enabled: boolean = true) {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !user?.id) return;

    const channel = createRealtimeChannel(`cron-fail-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as CronFailureNotification;
          if (row.category !== "cron_failure") return;

          toast.error(row.title, {
            description: row.body
              ? row.body.slice(0, 200)
              : "A background job has failed",
            duration: 10000,
            action: row.route
              ? { label: "View", onClick: () => { window.location.href = row.route!; } }
              : undefined,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        removeRealtimeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, user?.id]);
}
