import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerFamilyNightPage() {
  const navigate = useNavigate();
  const [pizzaCount, setPizzaCount] = useState("3");
  const [sidesCount, setSidesCount] = useState("2");
  const [drinkCount, setDrinkCount] = useState("4");
  const [movieNight, setMovieNight] = useState(true);

  const save = () => {
    toast.success("Family night plan saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Family Night" subtitle="Plan a bundled home dinner" onBack={() => navigate("/checkout")} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={pizzaCount} onChange={(e) => setPizzaCount(e.target.value)} type="number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Pizza count" />
        <input value={sidesCount} onChange={(e) => setSidesCount(e.target.value)} type="number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Sides count" />
        <input value={drinkCount} onChange={(e) => setDrinkCount(e.target.value)} type="number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Drinks count" />
        <ToggleCard label="Movie night mode" value={movieNight} onToggle={() => setMovieNight((v) => !v)} />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Family Night</button>
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
