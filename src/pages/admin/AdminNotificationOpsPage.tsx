import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminNotificationOpsPage() {
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-notification-ops"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5000,
  });

  const pending = rows.filter((r: any) => !r.read_at && !r.dismissed_at).length;
  const sent = rows.filter((r: any) => !!r.read_at).length;
  const dismissed = rows.filter((r: any) => !!r.dismissed_at).length;

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
          <h1 className="text-lg font-bold text-foreground">Notification Ops</h1>
          <p className="text-xs text-muted-foreground">Notification queue monitor</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 pb-4">
        <Metric title="Pending" value={String(pending)} />
        <Metric title="Sent" value={String(sent)} />
        <Metric title="Dismissed" value={String(dismissed)} />
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
              <p className="text-sm font-bold text-foreground">{row.title || "notification"}</p>
              <p className="text-xs text-muted-foreground">
                {row.type || "system"} · {row.read_at ? "read" : "unread"}
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
