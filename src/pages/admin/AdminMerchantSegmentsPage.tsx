import { useNavigate } from "react-router-dom";

const MERCHANT_SEGMENTS = [
  { name: "Top Performers", count: 12 },
  { name: "Needs Menu Work", count: 21 },
  { name: "Slow Acceptance", count: 8 },
  { name: "Promo Ready", count: 17 },
];

export default function AdminMerchantSegmentsPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Merchant Segments" subtitle="Store operating clusters" onBack={() => navigate("/admin")} />
      <div className="space-y-3">
        {MERCHANT_SEGMENTS.map((row) => (
          <div key={row.name} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between">
            <div className="text-sm font-semibold">{row.name}</div>
            <div className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-bold">{row.count}</div>
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
