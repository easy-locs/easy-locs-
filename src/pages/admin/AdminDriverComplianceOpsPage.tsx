import { useNavigate } from "react-router-dom";

const DRIVER_ROWS = [
  { name: "Ali", docs: "Complete", vehicle: "Pending", score: 92 },
  { name: "Omar", docs: "Complete", vehicle: "Complete", score: 98 },
  { name: "Ziad", docs: "Pending", vehicle: "Complete", score: 76 },
  { name: "Hassan", docs: "Complete", vehicle: "Pending", score: 81 },
];

export default function AdminDriverComplianceOpsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Driver Compliance Ops" subtitle="Document and vehicle verification" onBack={() => navigate("/admin")} />

      <div className="space-y-3">
        {DRIVER_ROWS.map((row) => (
          <div key={row.name} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-foreground">{row.name}</div>
                <div className="text-xs text-muted-foreground mt-1">Docs: {row.docs} · Vehicle: {row.vehicle}</div>
              </div>
              <ScorePill score={row.score} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls = score >= 90 ? "bg-emerald-500/10 text-emerald-500" : score >= 80 ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive";
  return <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{score}%</div>;
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
