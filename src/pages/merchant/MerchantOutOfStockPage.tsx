import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type StockRow = { id: string; name: string; out: boolean };

export default function MerchantOutOfStockPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [rows, setRows] = useState<StockRow[]>([
    { id: "1", name: "Coca Cola 330ml", out: true },
    { id: "2", name: "Pepperoni Topping", out: false },
    { id: "3", name: "Garlic Bread", out: true },
  ]);

  const toggle = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, out: !r.out } : r)));
    toast.success("Stock status updated");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Out of Stock" subtitle="Manage item availability" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)} />
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{row.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{row.out ? "Currently unavailable" : "Available"}</div>
              </div>
              <button onClick={() => toggle(row.id)} className={`rounded-full px-3 py-1 text-[11px] font-bold ${row.out ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
                {row.out ? "Out" : "In Stock"}
              </button>
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
      <div><h1 className="text-lg font-bold">{title}</h1><p className="text-xs text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}
