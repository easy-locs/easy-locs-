import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type FuelEntry = {
  id: string;
  date: string;
  amountAed: number;
  liters: number;
};

export default function DriverFuelCostsPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FuelEntry[]>([
    { id: "1", date: "2026-03-20", amountAed: 55, liters: 22 },
    { id: "2", date: "2026-03-19", amountAed: 48, liters: 19 },
    { id: "3", date: "2026-03-18", amountAed: 62, liters: 24 },
  ]);
  const [amount, setAmount] = useState("");
  const [liters, setLiters] = useState("");

  const total = useMemo(
    () => entries.reduce((sum, row) => sum + Number(row.amountAed || 0), 0),
    [entries]
  );

  const avgPerFill = useMemo(
    () => (entries.length ? total / entries.length : 0),
    [entries, total]
  );

  const addEntry = () => {
    const nextAmount = Number(amount);
    const nextLiters = Number(liters);
    if (!nextAmount || !nextLiters) return;
    setEntries((prev) => [
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        amountAed: nextAmount,
        liters: nextLiters,
      },
      ...prev,
    ]);
    setAmount("");
    setLiters("");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Fuel Costs" subtitle="Track transport expenses" onBack={() => navigate("/driver/dashboard")} />

      <div className="grid grid-cols-2 gap-3">
        <Metric title="Total" value={`${total.toFixed(2)} AED`} />
        <Metric title="Avg / Fill" value={`${avgPerFill.toFixed(2)} AED`} />
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold text-foreground">Add Fuel Entry</div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount AED" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" />
        <input value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="Liters" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" />
        <button onClick={addEntry} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
          Add Fuel Cost
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-foreground tabular-nums">{row.amountAed.toFixed(2)} AED</div>
                <div className="text-xs text-muted-foreground mt-1">{row.date} · {row.liters} L</div>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-foreground">Fuel</div>
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
      <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 active:scale-95 transition-transform"><ArrowLeft className="w-4.5 h-4.5" /></button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-border/20 bg-card p-4">
      <div className="text-[11px] uppercase font-bold text-muted-foreground">{title}</div>
      <div className="text-lg font-bold mt-1 text-foreground">{value}</div>
    </div>
  );
}
