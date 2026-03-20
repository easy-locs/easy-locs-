import { useNavigate } from "react-router-dom";

const MATRIX = [
  { feature: "View orders", manager: true, cashier: true, kitchen: true, support: false },
  { feature: "Edit menu", manager: true, cashier: false, kitchen: false, support: false },
  { feature: "Manage promos", manager: true, cashier: false, kitchen: false, support: false },
  { feature: "Reply reviews", manager: true, cashier: false, kitchen: false, support: true },
  { feature: "Resolve tickets", manager: true, cashier: false, kitchen: false, support: true },
];

export default function MerchantPermissionsMatrixPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Permissions Matrix" subtitle="Role access control" onBack={() => navigate(-1)} />

      <div className="space-y-3">
        {MATRIX.map((row) => (
          <div key={row.feature} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground mb-2">{row.feature}</div>
            <div className="flex flex-wrap gap-2">
              <PermissionPill label="Manager" on={row.manager} />
              <PermissionPill label="Cashier" on={row.cashier} />
              <PermissionPill label="Kitchen" on={row.kitchen} />
              <PermissionPill label="Support" on={row.support} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionPill({ label, on }: { label: string; on: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${on ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
