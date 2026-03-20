import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type InviteRow = { id: string; name: string; link: string };

export default function CustomerPartySplitLinksPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InviteRow[]>([
    { id: "1", name: "Ahmed", link: "https://app.local/join/ahmed" },
    { id: "2", name: "Sara", link: "https://app.local/join/sara" },
  ]);
  const [name, setName] = useState("");

  const addInvite = () => {
    if (!name.trim()) return;
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), link: `https://app.local/join/${encodeURIComponent(name.trim().toLowerCase())}` },
    ]);
    setName("");
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch {
      toast.success("Invite ready");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/checkout")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Party Split Links</h1>
          <p className="text-xs text-muted-foreground">Invite guests to split</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={addInvite} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Create Invite Link</button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.link}</div>
            <button onClick={() => copyLink(row.link)} className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground mt-4">Copy Link</button>
          </div>
        ))}
      </div>
    </div>
  );
}
