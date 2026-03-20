import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function MerchantQueueLimitPage() {
  const navigate = useNavigate();
  const [limit, setLimit] = useState("15");
  const [warningAt, setWarningAt] = useState("10");

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Queue Limit" subtitle="Protect kitchen against overload" onBack={() => navigate(-1)} />
      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={limit} onChange={(e) => setLimit(e.target.value)} type="number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Absolute queue limit" />
        <input value={warningAt} onChange={(e) => setWarningAt(e.target.value)} type="number" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Warning threshold" />
        <button className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">Save Queue Limits</button>
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
