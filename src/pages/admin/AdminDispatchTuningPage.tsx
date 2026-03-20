import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminDispatchTuningPage() {
  const navigate = useNavigate();
  const [searchRadiusKm, setSearchRadiusKm] = useState("6");
  const [driverWeight, setDriverWeight] = useState("0.45");
  const [reliabilityWeight, setReliabilityWeight] = useState("0.30");
  const [acceptanceWeight, setAcceptanceWeight] = useState("0.15");

  const save = () => {
    toast.success("Dispatch tuning saved");
    navigate("/admin");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Dispatch Tuning" subtitle="Adjust ranking and assignment logic" onBack={() => navigate("/admin")} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={searchRadiusKm} onChange={(e) => setSearchRadiusKm(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Search radius km" />
        <input value={driverWeight} onChange={(e) => setDriverWeight(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Distance weight" />
        <input value={reliabilityWeight} onChange={(e) => setReliabilityWeight(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Reliability weight" />
        <input value={acceptanceWeight} onChange={(e) => setAcceptanceWeight(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Acceptance weight" />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Dispatch Tuning</button>
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
