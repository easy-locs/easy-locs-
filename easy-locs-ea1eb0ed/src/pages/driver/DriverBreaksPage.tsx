import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type BreakRow = { id: string; start: string; end: string; reason: string };

export default function DriverBreaksPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BreakRow[]>([
    { id: "1", start: "13:15", end: "13:35", reason: "Lunch" },
    { id: "2", start: "17:40", end: "17:50", reason: "Prayer" },
  ]);
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("15:15");
  const [reason, setReason] = useState("Break");

  const totalMinutes = useMemo(() => {
    return rows.reduce((sum, row) => {
      const [sh, sm] = row.start.split(":").map(Number);
      const [eh, em] = row.end.split(":").map(Number);
      return sum + (eh * 60 + em - (sh * 60 + sm));
    }, 0);
  }, [rows]);

  const addBreak = () => {
    setRows((prev) => [{ id: crypto.randomUUID(), start, end, reason }, ...prev]);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Breaks" subtitle="Break log and planning" onBack={() => navigate("/driver/dashboard")} />

      <div className="rounded-[28px] border border-border/20 bg-card p-4">
        <div className="text-[11px] uppercase font-bold text-muted-foreground">Total break time</div>
        <div className="text-lg font-bold mt-1 text-foreground">{totalMinutes} min</div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold text-foreground">Add Break</div>
        <input value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="time" />
        <input value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="time" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={addBreak} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
          Add Break
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{row.reason}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.start} → {row.end}</div>
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
