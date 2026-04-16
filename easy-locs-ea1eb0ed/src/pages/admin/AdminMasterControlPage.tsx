import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useAuthSession } from "@/contexts/AuthContext";
import { hasRole } from "@/repositories/auth-utils.repository";
import SubPageShell from "@/components/layout/SubPageShell";

const PANELS = [
  { label: "System Live", path: "/admin/system-live" },
  { label: "Restaurant Autofill", path: "/admin/restaurant-autofill" },
  { label: "Payment Go Live", path: "/admin/payment-go-live" },
  { label: "Go Live Readiness", path: "/admin/go-live-readiness" },
  { label: "UI Finalizer", path: "/admin/ui-finalizer" },
  { label: "Super Dashboard", path: "/admin/super-dashboard" },
  { label: "Marketplace Ops", path: "/admin/ops-dashboard" },
  { label: "Support Ops", path: "/admin/support-ops" },
  { label: "Delivery Ops", path: "/admin/delivery-ops" },
  { label: "Payments Ops", path: "/admin/payments-ops" },
  { label: "Analytics Ops", path: "/admin/analytics-ops" },
  { label: "CRM Ops", path: "/admin/crm-ops" },
  { label: "Demand Forecast", path: "/admin/demand-forecast" },
  { label: "Market Expansion", path: "/admin/market-expansion" },
  { label: "Refund Queue", path: "/admin/refund-queue" },
  { label: "SLA Monitor", path: "/admin/sla-monitor" },
  { label: "Platform Health", path: "/admin/platform-health" },
  { label: "Executive Overview", path: "/admin/executive-overview" },
  { label: "Driver Compliance Ops", path: "/admin/driver-compliance-ops" },
  { label: "Marketplace Experiments", path: "/admin/marketplace-experiments" },
  { label: "Order Audit", path: "/admin/order-audit" },
  { label: "Fraud Watch", path: "/admin/fraud-watch" },
  { label: "Incident Center", path: "/admin/incident-center" },
  { label: "QA Command", path: "/admin/qa-command" },
  { label: "Region Performance", path: "/admin/region-performance" },
  { label: "Courier Heatmap", path: "/admin/courier-heatmap" },
  { label: "Customer Retention", path: "/admin/customer-retention" },
  { label: "Growth Campaigns", path: "/admin/growth-campaigns" },
  { label: "Promo Performance", path: "/admin/promo-performance" },
  { label: "Acquisition Funnel", path: "/admin/acquisition-funnel" },
  { label: "Driver Incentives", path: "/admin/driver-incentives" },
  { label: "City Launch Checklist", path: "/admin/city-launch-checklist" },
  { label: "System Live Status", path: "/admin/system-live-status" },
  { label: "Central Control Panel", path: "/admin/central-control" },
  { label: "Live Incident Feed", path: "/admin/live-incident-feed" },
  { label: "Risk Scoreboard", path: "/admin/risk-scoreboard" },
  { label: "Store Readiness Matrix", path: "/admin/store-readiness-matrix" },
  { label: "Dispatch Tuning", path: "/admin/dispatch-tuning" },
  { label: "Payment Watch", path: "/admin/payment-watch" },
  { label: "Menu Quality", path: "/admin/menu-quality" },
  { label: "Delivery Latency", path: "/admin/delivery-latency" },
  { label: "Driver Payouts", path: "/admin/driver-payouts" },
  { label: "Merchant Payouts", path: "/admin/merchant-payouts" },
  { label: "Wallet Recon", path: "/admin/wallet-recon" },
  { label: "⚡ Internal Lab Hub", path: "/admin/lab-hub" },
  { label: "⚡ Performance Lab", path: "/admin/performance-lab" },
  { label: "⚡ Data Lab", path: "/admin/data-lab" },
  { label: "⚡ Security Lab", path: "/admin/security-lab" },
  { label: "⚡ Release Factory", path: "/admin/release-history" },
  { label: "⚡ Notification Lab", path: "/admin/notification-lab" },
  { label: "⚡ Experiment Lab", path: "/admin/experiment-lab" },
  { label: "⚡ Architecture Lab", path: "/admin/architecture-lab" },
  { label: "⚡ API Documentation", path: "/developer-portal/docs" },
];

const SUPER_ADMIN_PANELS = [
  { label: "🤖 Command Center", path: "/admin/command-center" },
];

export default function AdminMasterControlPage() {
  useUiEngine("admin-adminmastercontrolpage");
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    hasRole(user.id, "super_admin").then((result) => {
      if (!cancelled) setIsSuperAdmin(result);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const visiblePanels = isSuperAdmin ? [...PANELS, ...SUPER_ADMIN_PANELS] : PANELS;

  return (
    <SubPageShell>
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Master Control</h1>
          <p className="text-xs text-muted-foreground">Central admin hub</p>
        </div>
      </div>

      <div className="space-y-3">
        {visiblePanels.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full rounded-2xl bg-card border border-border/20 px-4 py-4 text-left text-sm font-bold text-foreground active:scale-[0.98] transition-transform"
          >
            {item.label}
          </button>
        ))}
      </div>
      </div>
    </SubPageShell>
  );
}
