import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type SplitMember = { id: string; name: string; amount: number };

export default function CustomerSplitBillPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<SplitMember[]>([
    { id: "1", name: "You", amount: 24 },
    { id: "2", name: "Ali", amount: 24 },
  ]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("0");

  const addMember = () => {
    if (!name.trim()) { toast.error("Enter a name"); return; }
    setMembers((prev) => [...prev, { id: crypto.randomUUID(), name: name.trim(), amount: Number(amount || 0) }]);
    setName(""); setAmount("0");
    toast.success("Split member added");
  };

  const total = members.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Split Bill" subtitle="Share the cost" onBack={() => navigate("/checkout")} />
      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-xs text-muted-foreground">Current Split Total</div>
        <div className="text-2xl font-bold mt-1">{total.toFixed(2)} AED</div>
      </div>
      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Member name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" type="number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3" />
        <button onClick={addMember} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full mt-4">Add Member</button>
      </div>
      <div className="space-y-3">
        {members.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{Number(row.amount).toFixed(2)} AED</div>
          </div>
        ))}
      </div>
      <button onClick={() => { toast.success("Bill split saved"); navigate("/checkout"); }} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Confirm Split</button>
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
