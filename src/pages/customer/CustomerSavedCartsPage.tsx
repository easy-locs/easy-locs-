import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type SavedCartRow = { id: string; title: string; items: number; total: number };

export default function CustomerSavedCartsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedCartRow[]>([
    { id: "1", title: "Friday Pizza Night", items: 4, total: 126 },
    { id: "2", title: "Office Lunch", items: 7, total: 214 },
  ]);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Saved Carts" subtitle="Restore previous carts" onBack={() => navigate("/me")} />
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.items} items · {row.total.toFixed(2)} AED</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => { toast.success(`Cart restored: ${row.title}`); navigate("/checkout"); }} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Restore</button>
              <button onClick={() => { setRows((p) => p.filter((r) => r.id !== row.id)); toast.success("Saved cart removed"); }} className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">Delete</button>
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
