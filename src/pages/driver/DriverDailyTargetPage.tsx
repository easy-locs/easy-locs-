import { useNavigate } from "react-router-dom";

export default function DriverDailyTargetPage() {
  const navigate = useNavigate();

  const completed = 7;
  const target = 12;
  const progress = Math.round((completed / target) * 100);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Daily Target" subtitle="Deliveries and earnings goal" onBack={() => navigate("/driver/dashboard")} />

      <div className="rounded-[28px] border border-border/20 bg-card p-5">
        <div className="text-[11px] uppercase font-bold text-muted-foreground">Today's progress</div>
        <div className="text-3xl font-bold mt-1">{progress}%</div>
        <div className="text-sm text-muted-foreground mt-1">
          {completed} / {target} deliveries
        </div>

        <div className="w-full h-3 rounded-full bg-muted mt-4 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
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
