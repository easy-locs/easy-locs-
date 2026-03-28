import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchOpsDashboardData } from "@/repositories/admin-ops.repository";

export default function AdminOpsDashboardPage() {
  const navigate = useNavigate();

  const { data } = useQuery({ queryKey: ["admin-ops-dashboard"], queryFn: fetchOpsDashboardData, staleTime: 15_000 });
  const orders = data?.orders ?? [];
  const merchants = data?.merchants ?? [];
  const tickets = data?.tickets ?? [];

  const activeMerchants = merchants.filter((m: any) => m.is_active).length;
  const openTickets = tickets.filter((t: any) => t.status === "open").length;
  const activeOrders = orders.filter((o: any) => ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "on_the_way"].includes(o.status)).length;
  const failedOrders = orders.filter((o: any) => ["cancelled", "disputed"].includes(o.status)).length;
  const gross = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">←</button>
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
