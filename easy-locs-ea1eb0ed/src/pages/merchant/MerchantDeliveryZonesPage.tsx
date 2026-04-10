import { useNavigate } from "react-router-dom";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { useState } from "react";
import { toast } from "sonner";

type ZoneRow = { id: string; name: string; fee: number; eta: string };

export default function MerchantDeliveryZonesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ZoneRow[]>([
    { id: "1", name: "Dubai Marina", fee: 7, eta: "20-30 min" },
    { id: "2", name: "JLT", fee: 8, eta: "25-35 min" },
  ]);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [eta, setEta] = useState("");

  const addZone = () => {
    if (!name.trim()) return;
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), fee: Number(fee || 0), eta: eta || "30-40 min" },
    ]);
    setName("");
    setFee("");
    setEta("");
  };

  const save = () => {
    toast.success("Delivery zones saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Delivery Zones" subtitle="Manage coverage areas" onBack={() => navigate(-1)} />

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Fee AED" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" />
        <input value={eta} onChange={(e) => setEta(e.target.value)} placeholder="ETA" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={addZone} className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground w-full">
          Add Zone
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Fee {formatMoneyByCountry(row.fee, null, "AED")} · {row.eta}</div>
          </div>
        ))}
      </div>

      <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
        Save Zones
      </button>
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
