import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LoyaltyCard from "@/components/loyalty/LoyaltyCard";

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["customer-profile-stats", user?.id],
    queryFn: async () => {
      const [{ data: orders }, { data: tickets }, { data: favorites }] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total_amount,status")
          .eq("customer_user_id", user!.id)
          .limit(500),
        supabase
          .from("support_tickets")
          .select("id,status")
          .eq("requester_user_id", user!.id)
          .limit(500),
        supabase
          .from("user_favorites")
          .select("id")
          .eq("user_id", user!.id)
          .limit(500),
      ]);

      const orderRows = orders ?? [];
      const totalSpent = orderRows.reduce(
        (sum: number, row: any) => sum + Number(row.total_amount ?? 0),
        0
      );
      const completedOrders = orderRows.filter((row: any) =>
        ["completed", "delivered"].includes(String(row.status ?? ""))
      ).length;

      return {
        totalSpent,
        totalOrders: orderRows.length,
        completedOrders,
        totalTickets: (tickets ?? []).length,
        totalFavorites: (favorites ?? []).length,
      };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">My Profile</h1>
          <p className="text-xs text-muted-foreground">Account summary</p>
        </div>
      </div>

      <div className="px-4 py-3 text-center">
        <p className="text-base font-bold text-foreground">{user?.email || "Customer"}</p>
        <p className="text-xs text-muted-foreground">Easy-Locs account</p>
      </div>

      <LoyaltyCard userId={user?.id} />

      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <Metric title="Total Spent" value={`${Number(stats?.totalSpent ?? 0).toFixed(2)} AED`} />
        <Metric title="Orders" value={String(stats?.totalOrders ?? 0)} />
        <Metric title="Completed" value={String(stats?.completedOrders ?? 0)} />
        <Metric title="Tickets" value={String(stats?.totalTickets ?? 0)} />
        <Metric title="Favorites" value={String(stats?.totalFavorites ?? 0)} />
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        <button
          onClick={() => navigate("/my-orders")}
          className="rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold"
        >
          My Orders
        </button>
        <button
          onClick={() => navigate("/favorites")}
          className="rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold"
        >
          Favorites
        </button>
        <button
          onClick={() => navigate("/wallet/hub")}
          className="rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold"
        >
          Wallet
        </button>
        <button
          onClick={() => navigate("/support/tickets")}
          className="rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold"
        >
          Support
        </button>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
