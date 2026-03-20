import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type PartyLine = { id: string; label: string; qty: number };

export default function CustomerBulkPartyBuilderPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PartyLine[]>([
    { id: "1", label: "Large Pizza", qty: 4 },
    { id: "2", label: "Garlic Bread", qty: 6 },
    { id: "3", label: "Soft Drinks", qty: 10 },
  ]);
  const [label, setLabel] = useState("");
  const [qty, setQty] = useState("1");

  const addLine = () => {
    if (!label.trim()) return;
    setRows((prev) => [...prev, { id: crypto.randomUUID(), label: label.trim(), qty: Number(qty || 1) }]);
    setLabel("");
    setQty("1");
  };

  const save = () => {
    toast.success("Bulk party builder saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Bulk Party Builder</h1>
          <p className="text-xs text-muted-foreground">Prepare larger food quantities fast</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Item label" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" placeholder="Qty" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={addLine} className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">Add Item</button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{row.label}</div>
            <div className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold">{row.qty}</div>
          </div>
        ))}
      </div>

      <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Party Builder</button>
    </div>
  );
}
