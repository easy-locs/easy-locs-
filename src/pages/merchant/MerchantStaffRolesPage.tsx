import { useNavigate } from "react-router-dom";

const ROLES = [
  { name: "Manager", rights: "Orders, menu, promos, support" },
  { name: "Cashier", rights: "Orders, payment verification" },
  { name: "Kitchen", rights: "Kitchen display, item readiness" },
  { name: "Support", rights: "Tickets, issue handling" },
];

export default function MerchantStaffRolesPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Staff Roles" subtitle="Role definitions and permissions" onBack={() => navigate(-1)} />

      <div className="space-y-3">
        {ROLES.map((row) => (
          <div key={row.name} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.rights}</div>
          </div>
        ))}
      </div>
    </div>
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
