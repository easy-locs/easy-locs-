import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import {
  fetchSuperDashboardOrders,
  fetchSuperDashboardMerchants,
  fetchSuperDashboardDrivers,
  fetchSuperDashboardTickets,
  fetchSuperDashboardLedger,
} from "@/repositories/admin-ops.repository";
import { projectSuperDashboard } from "@/families/dashboard/dashboard.read-model";
import { useWalletStore } from "@/stores/walletStore";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";

const ADMIN_NAV_LINKS = [
  { label: "Marketplace Ops", path: "/admin/ops-dashboard" },
  { label: "Support Ops", path: "/admin/support-ops" },
  { label: "Delivery Ops", path: "/admin/delivery-ops" },
  { label: "Payments Ops", path: "/admin/payments-ops" },
  { label: "Orchestration Logs", path: "/admin/orchestration" },
  { label: "Master Pipeline", path: "/admin/pipeline" },
  { label: "Merchant Auto-Onboarding", path: "/admin/merchant-autofill" },
  { label: "Bulk Merchant Import", path: "/admin/bulk-merchant-import" },
  { label: "Seed Tools", path: "/admin/seed-tools" },
] as const;

export default function AdminSuperDashboardPage() {
  const navigate = useNavigate();

  const { data: orders = [] } = useQuery({ queryKey: ["super-dashboard-orders"], queryFn: fetchSuperDashboardOrders, staleTime: 10000 });
  const { data: merchants = [] } = useQuery({ queryKey: ["super-dashboard-merchants"], queryFn: fetchSuperDashboardMerchants, staleTime: 30000 });
  const { data: drivers = [] } = useQuery({ queryKey: ["super-dashboard-drivers"], queryFn: fetchSuperDashboardDrivers, staleTime: 10000 });
  const { data: tickets = [] } = useQuery({ queryKey: ["super-dashboard-tickets"], queryFn: fetchSuperDashboardTickets, staleTime: 10000 });
  const { data: ledger = [] } = useQuery({ queryKey: ["super-dashboard-ledger"], queryFn: fetchSuperDashboardLedger, staleTime: 10000 });

  const walletCurrency = useWalletStore((s) => s.wallet?.currency) ?? getWalletDefaultCurrency();

  const model = useMemo(
    () => projectSuperDashboard(orders, merchants, drivers, tickets, ledger, walletCurrency),
    [orders, merchants, drivers, tickets, ledger, walletCurrency],
  );

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
          {model.metrics.map((m) => (
            <div key={m.title} className="rounded-2xl border border-border/20 bg-card p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold">{m.title}</p>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {ADMIN_NAV_LINKS.map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)} className="w-full rounded-2xl bg-card border border-border/20 px-4 py-3 text-left text-sm font-semibold text-foreground active:scale-[0.98] transition-transform">
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
