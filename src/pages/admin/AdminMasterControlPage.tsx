import { useNavigate } from "react-router-dom";

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
];

export default function AdminMasterControlPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Master Control</h1>
          <p className="text-xs text-muted-foreground">Central admin hub</p>
        </div>
      </div>

      <div className="space-y-3">
        {PANELS.map((item) => (
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
  );
}
