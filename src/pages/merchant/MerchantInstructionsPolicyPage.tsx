import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function MerchantInstructionsPolicyPage() {
  const navigate = useNavigate();
  const [allowCustomNotes, setAllowCustomNotes] = useState(true);
  const [maxLength, setMaxLength] = useState("120");
  const [blockedWords, setBlockedWords] = useState("free, refund");

  const save = () => {
    toast.success("Instructions policy saved");
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Instructions Policy" subtitle="Rules for customer order notes" onBack={() => navigate(-1)} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <ToggleCard label="Allow custom notes" value={allowCustomNotes} onToggle={() => setAllowCustomNotes((v) => !v)} />
        <input value={maxLength} onChange={(e) => setMaxLength(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" type="number" placeholder="Max length" />
        <textarea value={blockedWords} onChange={(e) => setBlockedWords(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none" rows={4} placeholder="Blocked words" />
        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Policy</button>
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
