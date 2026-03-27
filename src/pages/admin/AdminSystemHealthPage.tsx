import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminSystemHealthPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: async () => {
      const [
        { count: users },
        { count: orders },
        { count: tickets },
        { count: wallets },
        { count: notifications },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }),
        supabase.from("wallet_accounts").select("*", { count: "exact", head: true }),
        (supabase as any).from("app_notifications").select("*", { count: "exact", head: true }),
      ]);
      return { users: users ?? 0, orders: orders ?? 0, tickets: tickets ?? 0, wallets: wallets ?? 0, notifications: notifications ?? 0 };
    },
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">System Health</h1>
          <p className="text-xs text-muted-foreground">Global platform monitor</p>
        </div>
      </div>

      {isLoading ? (
        <>{[1, 2, 3].map((i) => <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />)}</>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 px-4">
          <Metric title="Users" value={String(data.users)} />
          <Metric title="Orders" value={String(data.orders)} />
          <Metric title="Tickets" value={String(data.tickets)} />
          <Metric title="Wallets" value={String(data.wallets)} />
          <Metric title="Notifications" value={String(data.notifications)} />
        </div>
      ) : null}
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
