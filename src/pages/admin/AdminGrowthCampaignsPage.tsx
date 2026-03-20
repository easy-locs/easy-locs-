import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type CampaignRow = { id: string; title: string; channel: string; status: "draft" | "active" | "paused"; budget: number };

function StatusPill({ value }: { value: string }) {
  const cls = value === "active" ? "bg-emerald-500/10 text-emerald-500" : value === "paused" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-foreground";
  return <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{value}</div>;
}

export default function AdminGrowthCampaignsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CampaignRow[]>([
    { id: "1", title: "Lunch Push Marina", channel: "push", status: "active", budget: 1200 },
    { id: "2", title: "New Users JLT", channel: "promo", status: "paused", budget: 800 },
    { id: "3", title: "Late Night Pizza", channel: "sms", status: "draft", budget: 1500 },
  ]);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("push");
  const [budget, setBudget] = useState("");

  const createCampaign = () => {
    if (!title.trim()) return;
    setRows((prev) => [{ id: crypto.randomUUID(), title: title.trim(), channel, status: "draft", budget: Number(budget || 0) }, ...prev]);
    setTitle(""); setChannel("push"); setBudget("");
    toast.success("Campaign created");
  };

  const cycleStatus = (id: string) => {
    setRows((prev) => prev.map((row) => {
      if (row.id !== id) return row;
      const next = row.status === "draft" ? "active" : row.status === "active" ? "paused" : "draft";
      return { ...row, status: next as any };
    }));
    toast.success("Campaign updated");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Growth Campaigns</h1>
          <p className="text-xs text-muted-foreground">Create and manage campaigns</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold">Create Campaign</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm">
          <option value="push">Push</option>
          <option value="promo">Promo</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
        <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" placeholder="Budget AED" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={createCampaign} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Create Campaign</button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{row.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{row.channel} · {row.budget.toFixed(0)} AED</div>
              </div>
              <StatusPill value={row.status} />
            </div>
            <button onClick={() => cycleStatus(row.id)} className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground mt-4">Change Status</button>
          </div>
        ))}
      </div>
    </div>
  );
}
