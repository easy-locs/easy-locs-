import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export default function AdminSuperDashboardPage() {
  const navigate = useNavigate();

  const { data: orders = [] } = useQuery({
    queryKey: ["super-dashboard-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,status,total_amount,payment_status").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10000,
  });

  const { data: merchants = [] } = useQuery({
    queryKey: ["super-dashboard-merchants"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("seed_merchants").select("id,is_active,is_open,promo_active").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["super-dashboard-drivers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("driver_profiles").select("id,is_online,is_available").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10000,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["super-dashboard-tickets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("support_tickets").select("id,status").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10000,
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["super-dashboard-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wallet_ledger_entries").select("id,amount,direction,entry_type").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10000,
  });

  const gross = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0);
  const activeOrders = orders.filter((o: any) =>
    ["paid", "confirmed", "preparing", "driver_search", "driver_assigned", "picked_up", "on_the_way"].includes(o.status)
  ).length;
  const paidOrders = orders.filter((o: any) =>
    ["captured", "paid"].includes(String(o.payment_status ?? ""))
  ).length;
  const onlineDrivers = drivers.filter((d: any) => d.is_online).length;
  const availableDrivers = drivers.filter((d: any) => d.is_online && d.is_available).length;
  const openTickets = tickets.filter((t: any) => t.status === "open").length;
  const activeMerchants = merchants.filter((m: any) => m.is_active).length;
  const openMerchants = merchants.filter((m: any) => m.is_open).length;
  const activePromos = merchants.filter((m: any) => m.promo_active).length;
  const totalIn = ledger.filter((l: any) => l.direction === "in").reduce((sum: number, l: any) => sum + Number(l.amount ?? 0), 0);
  const totalOut = ledger.filter((l: any) => l.direction === "out").reduce((sum: number, l: any) => sum + Number(l.amount ?? 0), 0);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Admin Super Dashboard</h1>
          <p className="text-xs text-muted-foreground">Central operations view</p>
        </div>
      </header>

      <div className="px-4 pb-24 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { title: "Gross GMV", value: `${gross.toFixed(0)} AED` },
            { title: "Active Orders", value: String(activeOrders) },
            { title: "Paid Orders", value: String(paidOrders) },
            { title: "Active Merchants", value: String(activeMerchants) },
            { title: "Open Merchants", value: String(openMerchants) },
            { title: "Active Promos", value: String(activePromos) },
            { title: "Online Drivers", value: String(onlineDrivers) },
            { title: "Available Drivers", value: String(availableDrivers) },
            { title: "Open Tickets", value: String(openTickets) },
            { title: "Ledger In", value: `${totalIn.toFixed(0)} AED` },
            { title: "Ledger Out", value: `${totalOut.toFixed(0)} AED` },
            { title: "Total Orders", value: String(orders.length) },
          ].map((m) => (
            <div key={m.title} className="rounded-2xl border border-border/20 bg-card p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold">{m.title}</p>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {[
            { label: "Marketplace Ops", path: "/admin/ops-dashboard" },
            { label: "Support Ops", path: "/admin/support-ops" },
            { label: "Delivery Ops", path: "/admin/delivery-ops" },
            { label: "Payments Ops", path: "/admin/payments-ops" },
            { label: "Orchestration Logs", path: "/admin/orchestration" },
            { label: "Master Pipeline", path: "/admin/pipeline" },
            { label: "Merchant Auto-Onboarding", path: "/admin/merchant-autofill" },
            { label: "Bulk Merchant Import", path: "/admin/bulk-merchant-import" },
            { label: "Seed Tools", path: "/admin/seed-tools" },
          ].map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)} className="w-full rounded-2xl bg-card border border-border/20 px-4 py-3 text-left text-sm font-semibold text-foreground active:scale-[0.98] transition-transform">
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
