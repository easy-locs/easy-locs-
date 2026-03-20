import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminCrmOpsPage() {
  const navigate = useNavigate();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-crm-users"],
    queryFn: async () => {
      const [{ data: loyalty }, { data: favorites }, { data: tickets }] = await Promise.all([
        (supabase as any).from("loyalty_accounts").select("*").limit(500),
        supabase.from("user_favorites").select("*").limit(1000),
        supabase.from("support_tickets").select("*").limit(1000),
      ]);

      const loyaltyRows = loyalty ?? [];
      return loyaltyRows.map((row: any) => ({
        userId: row.user_id,
        points: Number(row.points_balance ?? 0),
        tier: row.tier ?? "bronze",
        favorites: (favorites ?? []).filter((f: any) => f.user_id === row.user_id).length,
        tickets: (tickets ?? []).filter((t: any) => t.requester_user_id === row.user_id).length,
      }));
    },
    staleTime: 10000,
  });

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
          <h1 className="text-lg font-bold text-foreground">CRM Ops</h1>
          <p className="text-xs text-muted-foreground">Customer loyalty and retention</p>
        </div>
      </div>

      {isLoading &&
        [1, 2, 3].map((i) => (
          <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
        ))}

      {!isLoading && users.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No CRM data yet
        </div>
      )}

      {!isLoading && users.length > 0 && (
        <div className="px-4 space-y-3">
          {users.slice(0, 40).map((row: any) => (
            <div
              key={row.userId}
              className="rounded-2xl border border-border/20 bg-card p-4"
            >
              <p className="text-sm font-bold text-foreground">
                User {String(row.userId).slice(0, 8)}
              </p>
              <p className="text-xs text-muted-foreground">
                Tier {row.tier} · {row.points} pts
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Favorites {row.favorites} · Tickets {row.tickets}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
