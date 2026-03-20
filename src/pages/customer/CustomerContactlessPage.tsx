import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerContactlessPage() {
  const navigate = useNavigate();
  const [contactless, setContactless] = useState(true);
  const [pinDrop, setPinDrop] = useState(false);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Contactless Delivery" subtitle="Set delivery preferences" onBack={() => navigate("/checkout")} />
      <div className="space-y-3">
        <ToggleRow label="Contactless delivery" value={contactless} onToggle={() => setContactless((v) => !v)} />
        <ToggleRow label="Pin drop location" value={pinDrop} onToggle={() => setPinDrop((v) => !v)} />
      </div>
      <button onClick={() => { toast.success("Delivery preference saved"); navigate("/checkout"); }} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Preference</button>
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

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between rounded-2xl border border-border/20 bg-card px-4 py-3 text-left">
      <span className="text-sm font-semibold">{label}</span>
      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${value ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}>{value ? "On" : "Off"}</span>
    </button>
  );
}
