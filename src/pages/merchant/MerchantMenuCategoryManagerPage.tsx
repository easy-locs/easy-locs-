import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function MerchantMenuCategoryManagerPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(["Pizzas", "Sides", "Drinks"]);
  const [value, setValue] = useState("");

  const add = () => {
    if (!value.trim()) return;
    setRows((prev) => [...prev, value.trim()]);
    setValue("");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Menu Categories" subtitle="Organize merchant categories" onBack={() => navigate(-1)} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="New category" />
        <button onClick={add} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Add Category</button>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row} className="rounded-[28px] border border-border/20 bg-card p-4 text-sm font-semibold">{row}</div>
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
