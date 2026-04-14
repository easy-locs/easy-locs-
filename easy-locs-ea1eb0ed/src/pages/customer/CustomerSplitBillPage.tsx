import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { splitAmountEvenly } from "@/lib/checkout/splitBill";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function CustomerSplitBillPage() {
  useUiEngine("customer-customersplitbillpage");
  const navigate = useNavigate();
  const [people, setPeople] = useState(2);
  const [total, setTotal] = useState(100);

  const rows = useMemo(() => splitAmountEvenly(total, people), [total, people]);

  const save = () => {
    toast.success("Split bill prepared");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Split Bill" subtitle="Share the cost" onBack={() => navigate("/checkout")} />

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input
          type="number"
          value={total}
          onChange={(e) => setTotal(Number(e.target.value))}
          placeholder="Total amount"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />

        <input
          type="number"
          value={people}
          onChange={(e) => setPeople(Math.max(1, Number(e.target.value)))}
          placeholder="Number of people"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />

        <div className="space-y-2 mt-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
              <span className="text-sm font-semibold">{row.name}</span>
              <span className="text-sm font-bold tabular-nums">{row.amount.toFixed(2)} AED</span>
            </div>
          ))}
        </div>

        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
          Save Split Bill
        </button>
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
