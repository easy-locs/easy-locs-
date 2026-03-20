import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function CustomerDinnerBudgetPage() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState("80");
  const [people, setPeople] = useState("4");
  const perHead = (Number(budget || 0) / Math.max(1, Number(people || 1))).toFixed(2);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Dinner Budget" subtitle="Plan spending before ordering" onBack={() => navigate("/checkout")} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Total budget AED" />
        <input value={people} onChange={(e) => setPeople(e.target.value)} type="number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="People count" />
        <div className="rounded-2xl bg-muted/40 p-4">
          <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">Per Person</div>
          <div className="text-lg font-bold mt-2">{perHead} AED</div>
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
