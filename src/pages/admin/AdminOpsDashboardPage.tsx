import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AdminOpsDashboardPage() {
  const navigate = useNavigate();

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-ops-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,status,total_amount").limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });

  const { data: merchants = [] } = useQuery({
    queryKey: ["admin-ops-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seed_merchants").select("id,is_active,is_open").limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["admin-ops-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("id,status,ticket_type").limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const activeMerchants = merchants.filter((m: any) => m.is_active).length;
  const openTickets = tickets.filter((t: any) => t.status === "open").length;
  const activeOrders = orders.filter((o: any) =>
    ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "on_the_way"].includes(o.status)
  ).length;
  const failedOrders = orders.filter((o: any) => ["cancelled", "disputed"].includes(o.status)).length;
  const gross = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold">Operations Dashboard</h1>
          <p className="text-xs text-muted-foreground">Marketplace health</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric title="Active Merchants" value={String(activeMerchants)} />
        <Metric title="Active Orders" value={String(activeOrders)} />
        <Metric title="Failed Orders" value={String(failedOrders)} />
        <Metric title="Open Tickets" value={String(openTickets)} />
        <Metric title="Gross Volume" value={`${gross.toFixed(0)} AED`} />
        <Metric title="Total Orders" value={String(orders.length)} />
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
