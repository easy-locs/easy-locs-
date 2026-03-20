import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["notification-center", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dino_notifications")
        .select("*")
        .or(`actor_id.is.null,actor_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 5000,
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/home")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
          <p className="text-xs text-muted-foreground">Updates and alerts</p>
        </div>
      </header>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-12">
          No notifications yet
        </p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 pb-24 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{row.template_key || "Notification"}</p>
              <p className="text-[11px] text-muted-foreground">
                {row.channel} · {row.status} ·{" "}
                {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
