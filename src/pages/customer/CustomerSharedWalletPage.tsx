import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type MemberRow = { id: string; name: string; role: string };

export default function CustomerSharedWalletPage() {
  const navigate = useNavigate();
  const [balance] = useState(286.5);
  const [members, setMembers] = useState<MemberRow[]>([
    { id: "1", name: "You", role: "Owner" },
    { id: "2", name: "Family Member", role: "Member" },
  ]);
  const [inviteName, setInviteName] = useState("");

  const addMember = () => {
    if (!inviteName.trim()) { toast.error("Enter a member name"); return; }
    setMembers((prev) => [...prev, { id: crypto.randomUUID(), name: inviteName.trim(), role: "Member" }]);
    setInviteName("");
    toast.success("Member added to shared wallet");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/wallet/hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Shared Wallet</h1>
          <p className="text-xs text-muted-foreground">Family & group wallet</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-xs text-muted-foreground">Shared Balance</div>
        <div className="text-lg font-bold text-foreground mt-1">{balance.toFixed(2)} AED</div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="text-sm font-bold text-foreground">Invite Member</div>
        <div className="flex items-center gap-2 mt-3">
          <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Member name" className="flex-1 rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
          <button onClick={addMember} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Add</button>
        </div>
      </div>

      <div className="space-y-3">
        {members.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
