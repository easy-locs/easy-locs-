import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerFamilyProfilesPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([
    { id: "1", name: "Main Profile", note: "Default delivery account" },
    { id: "2", name: "Kids", note: "No spicy food" },
  ]);

  const addProfile = () => {
    setProfiles((p) => [
      ...p,
      { id: crypto.randomUUID(), name: `Profile ${p.length + 1}`, note: "New profile" },
    ]);
    toast.success("Profile added");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/me")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Family Profiles</h1>
          <p className="text-xs text-muted-foreground">Manage delivery profiles</p>
        </div>
      </div>
      <button onClick={addProfile} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">Add Profile</button>
      <div className="space-y-3">
        {profiles.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
