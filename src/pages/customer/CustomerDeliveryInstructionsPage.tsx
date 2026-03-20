import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerDeliveryInstructionsPage() {
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState("");
  const [ringBell, setRingBell] = useState(true);
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);

  const save = () => { toast.success("Delivery instructions saved"); navigate("/checkout"); };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Delivery Instructions" subtitle="Help your driver find you" onBack={() => navigate("/checkout")} />
      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5} placeholder="Building, floor, landmark, gate code..." className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none" />
        <div className="space-y-3 mt-4">
          <ToggleRow label="Ring bell" value={ringBell} onToggle={() => setRingBell((v) => !v)} />
          <ToggleRow label="Leave at door" value={leaveAtDoor} onToggle={() => setLeaveAtDoor((v) => !v)} />
        </div>
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full mt-4">Save Instructions</button>
      </div>
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
