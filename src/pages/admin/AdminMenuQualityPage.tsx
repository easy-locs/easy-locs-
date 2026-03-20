import { useNavigate } from "react-router-dom";

const MENU_QUALITY_ROWS = [
  { store: "Pizza Times Marina", missingImages: 1, missingDescriptions: 3, score: 91 },
  { store: "Pizza Times Downtown", missingImages: 0, missingDescriptions: 1, score: 97 },
  { store: "Pizza Times JVC", missingImages: 4, missingDescriptions: 6, score: 72 },
];

export default function AdminMenuQualityPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Menu Quality" subtitle="Content quality across merchant menus" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {MENU_QUALITY_ROWS.map((row) => (
          <div key={row.store} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.store}</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MiniMetric title="Imgs" value={String(row.missingImages)} />
              <MiniMetric title="Desc" value={String(row.missingDescriptions)} />
              <MiniMetric title="Score" value={String(row.score)} />
            </div>
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

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-3 py-3 text-center">
      <div className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">{title}</div>
      <div className="text-sm font-bold mt-2">{value}</div>
    </div>
  );
}
