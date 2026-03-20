import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

function ToggleCard({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between gap-3 text-left">
      <div className="text-sm font-semibold">{label}</div>
      <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${value ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}>
        {value ? "On" : "Off"}
      </div>
    </button>
  );
}

export default function MerchantPackagingSettingsPage() {
  const navigate = useNavigate();
  const [packagingFee, setPackagingFee] = useState("2");
  const [ecoDefault, setEcoDefault] = useState(true);
  const [sealedBags, setSealedBags] = useState(true);

  const save = () => {
    toast.success("Packaging settings saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Packaging Settings</h1>
          <p className="text-xs text-muted-foreground">Bags, seal and packaging fee</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={packagingFee} onChange={(e) => setPackagingFee(e.target.value)} type="number" placeholder="Packaging fee AED" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <ToggleCard label="Eco packaging default" value={ecoDefault} onToggle={() => setEcoDefault((v) => !v)} />
        <ToggleCard label="Use sealed bags" value={sealedBags} onToggle={() => setSealedBags((v) => !v)} />
        <button onClick={save} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Packaging</button>
      </div>
    </div>
  );
}
