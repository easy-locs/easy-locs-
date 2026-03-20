import { useNavigate } from "react-router-dom";

export default function DriverDailyTargetPage() {
  const navigate = useNavigate();
  const completed = 8;
  const target = 15;
  const progress = Math.min(100, Math.round((completed / target) * 100));

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Daily Target" subtitle="Track your delivery goal" onBack={() => navigate("/driver/dashboard")} />
      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-xs text-muted-foreground">Completed Today</div>
        <div className="text-2xl font-bold mt-1">{completed} / {target}</div>
        <div className="w-full h-3 rounded-full bg-muted mt-4 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-2">{progress}% progress</div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div><h1 className="text-lg font-bold">{title}</h1><p className="text-xs text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}
