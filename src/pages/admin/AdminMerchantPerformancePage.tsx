import { useNavigate } from "react-router-dom";

const MERCHANTS = [
  { id: "1", name: "Restaurant A", score: 96, orders: 412 },
  { id: "2", name: "Restaurant B", score: 89, orders: 287 },
  { id: "3", name: "Grocery C", score: 78, orders: 154 },
];

export default function AdminMerchantPerformancePage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Merchant Performance</h1>
          <p className="text-xs text-muted-foreground">Quality scores and order volume</p>
        </div>
      </div>
      <div className="space-y-3">
        {MERCHANTS.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{m.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Score {m.score} · Orders {m.orders}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
