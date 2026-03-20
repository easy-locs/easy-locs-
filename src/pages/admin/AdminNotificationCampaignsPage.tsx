import { useNavigate } from "react-router-dom";

const CAMPAIGNS = [
  { name: "Late Night Push", audience: "Night users", status: "active" },
  { name: "Lunch Reminder", audience: "Office users", status: "draft" },
  { name: "Reactivation 14d", audience: "Dormant users", status: "paused" },
];

export default function AdminNotificationCampaignsPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Notification Campaigns" subtitle="Broadcast strategy center" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {CAMPAIGNS.map((row) => (
          <div key={row.name} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">{row.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{row.audience}</div>
            </div>
            <SmallPill value={row.status} />
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

function SmallPill({ value }: { value: string }) {
  const cls =
    value === "active" ? "bg-emerald-500/10 text-emerald-500" :
    value === "paused" ? "bg-amber-500/10 text-amber-500" :
    "bg-muted text-foreground";
  return <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{value}</div>;
}
