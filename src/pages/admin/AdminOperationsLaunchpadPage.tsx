import { useNavigate } from "react-router-dom";

export default function AdminOperationsLaunchpadPage() {
  const navigate = useNavigate();

  const items = [
    { label: "Super Dashboard", path: "/admin/super-dashboard" },
    { label: "Ops Dashboard", path: "/admin/ops-dashboard" },
    { label: "Support Ops", path: "/admin/support-ops" },
    { label: "Delivery Ops", path: "/admin/delivery-ops" },
    { label: "Payments Ops", path: "/admin/payments-ops" },
    { label: "CRM Ops", path: "/admin/crm-ops" },
    { label: "Quality Ops", path: "/admin/quality-ops" },
    { label: "Analytics Ops", path: "/admin/analytics-ops" },
    { label: "Growth Ops", path: "/admin/growth-ops" },
    { label: "Retention Ops", path: "/admin/retention-ops" },
    { label: "Content Ops", path: "/admin/content-ops" },
    { label: "Merchant Autofill", path: "/admin/merchant-autofill" },
    { label: "Bulk Merchant Import", path: "/admin/bulk-merchant-import" },
    { label: "Seed Tools", path: "/admin/seed-tools" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-24">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Operations Launchpad</h1>
          <p className="text-xs text-muted-foreground">Quick access to all admin tools</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="rounded-2xl border border-border/20 bg-card px-4 py-4 text-left text-sm font-bold text-foreground active:scale-[0.98] transition-transform"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
