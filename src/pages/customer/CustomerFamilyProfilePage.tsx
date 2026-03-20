import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type Member = { id: string; name: string; preference: string };

export default function CustomerFamilyProfilePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Member[]>([
    { id: "1", name: "Dad", preference: "No onions" },
    { id: "2", name: "Mom", preference: "Vegetarian" },
    { id: "3", name: "Kid 1", preference: "Mild cheese pizza" },
  ]);
  const [name, setName] = useState("");
  const [preference, setPreference] = useState("");

  const addMember = () => {
    if (!name.trim()) return;
    setRows((prev) => [...prev, { id: crypto.randomUUID(), name: name.trim(), preference: preference.trim() }]);
    setName(""); setPreference("");
    toast.success("Family member added");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Family Profile</h1>
          <p className="text-xs text-muted-foreground">Food preferences per member</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold">Add Member</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={preference} onChange={(e) => setPreference(e.target.value)} placeholder="Food preference" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <button onClick={addMember} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Save Member</button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.preference || "No preference"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
