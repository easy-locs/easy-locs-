/**
 * AdminNotificationEnginePage — Admin view of notification queue.
 * Reads from canonical notifications_v2 table.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function listNotifications(limit = 100) {
  const { data, error } = await (supabase as any)
    .from("notifications_v2")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export default function AdminNotificationEnginePage() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-notification-engine-v2"],
    queryFn: () => listNotifications(100),
    staleTime: 5000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Notification Engine</h1>
          <p className="text-xs text-muted-foreground">Live notification queue — notifications_v2</p>
        </div>
      </div>

      <button onClick={() => refetch()} className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
        Refresh Queue
      </button>

      {isLoading && [1, 2, 3].map((i) => <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />)}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.actor} · {row.domain} · {row.priority} · {row.type} · {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  row.read_at ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                  {row.dismissed_at ? "dismissed" : row.read_at ? "read" : "unread"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{row.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
