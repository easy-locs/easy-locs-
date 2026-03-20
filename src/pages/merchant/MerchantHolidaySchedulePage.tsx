import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type HolidayRow = { id: string; date: string; note: string };

export default function MerchantHolidaySchedulePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<HolidayRow[]>([
    { id: "1", date: "2026-04-10", note: "Reduced hours" },
    { id: "2", date: "2026-04-11", note: "Closed" },
  ]);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const add = () => {
    if (!date) return;
    setRows((prev) => [...prev, { id: crypto.randomUUID(), date, note }]);
    setDate("");
    setNote("");
    toast.success("Holiday rule added");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Holiday Schedule" subtitle="Exceptional closures and special hours" onBack={() => navigate(-1)} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Note" />
        <button onClick={add} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Add Holiday Rule</button>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.date}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.note || "No note"}</div>
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
