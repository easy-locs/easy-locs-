import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminActiveSessionsPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-active-sessions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_logs")
        .select("action,created_at,entity_id,entity_type")
        .in("action", ["home_view", "merchant_view", "search_used"])
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      const rows = (data ?? []) as any[];
      const recent = rows.filter((r: any) => {
        if (!r.created_at) return false;
        return Date.now() - new Date(r.created_at).getTime() < 15 * 60 * 1000;
      });

      return { totalRecent: recent.length, rows: recent };
    },
    staleTime: 5000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Active Sessions</h1>
          <p className="text-xs text-muted-foreground">Recent user activity pulse</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mx-4 h-20 rounded-2xl bg-muted animate-pulse" />
      ) : (
        <div className="mx-4 rounded-2xl border border-border/20 bg-card p-4 mb-4">
          <p className="text-xs text-muted-foreground">Recent Activity Count</p>
          <p className="text-lg font-bold text-foreground">{String(data?.totalRecent ?? 0)}</p>
        </div>
      )}

      {!isLoading && (data?.rows ?? []).length > 0 && (
        <div className="px-4 space-y-3">
          {data!.rows.slice(0, 30).map((row: any, idx: number) => (
            <div key={idx} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">{row.event_type}</p>
              <p className="text-xs text-muted-foreground mt-1">{row.entity_type} · {String(row.entity_id).slice(0, 8)}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
