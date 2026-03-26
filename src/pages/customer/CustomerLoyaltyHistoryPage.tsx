import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerLoyaltyHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-loyalty-history", user?.id],
    queryFn: async () => {
      const [{ data: account }, { data: orders }] = await Promise.all([
        (supabase as any).from("loyalty_accounts").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase
          .from("orders")
          .select("id,total_amount,status,created_at")
          .eq("customer_user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const completed = (orders ?? []).filter((row: any) =>
        ["completed", "delivered"].includes(String(row.status ?? ""))
      );

      const history = completed.map((row: any) => ({
        id: row.id,
        createdAt: row.created_at,
        spent: Number(row.total_amount ?? 0),
        estimatedPoints: Math.floor(Number(row.total_amount ?? 0)),
      }));

      return { account, history };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Loyalty History</h1>
          <p className="text-xs text-muted-foreground">Points and reward activity</p>
        </div>
      </div>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <>
          <div className="mx-4 mb-4 rounded-2xl border border-border/20 bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold text-foreground">
              {Number((data.account as any)?.points_balance ?? 0)} pts
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Tier {(data.account as any)?.tier ?? "bronze"}
            </p>
          </div>

          <div className="px-4 space-y-3">
            {data.history.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground pt-4">No loyalty activity yet</p>
            ) : (
              data.history.map((row: any) => (
                <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-1">
                  <p className="text-sm font-semibold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">Spent {Number(row.spent).toFixed(2)} AED</p>
                  <p className="text-xs text-muted-foreground">Earned ~{row.estimatedPoints} pts</p>
                  <p className="text-[11px] text-muted-foreground/70">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
