import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantTemporaryClosurePage() {
  const navigate = useNavigate();
  const [closed, setClosed] = useState(false);
  const [reason, setReason] = useState("Maintenance");
  const [reopenAt, setReopenAt] = useState("2026-03-21T18:00");

  const save = () => {
    toast.success("Temporary closure saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Temporary Closure" subtitle="Pause the store with reason and reopen time" onBack={() => navigate(-1)} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <button onClick={() => setClosed((v) => !v)} className="rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground w-full">
          {closed ? "Store Closed" : "Store Open"}
        </button>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Reason" />
        <input value={reopenAt} onChange={(e) => setReopenAt(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Closure</button>
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
