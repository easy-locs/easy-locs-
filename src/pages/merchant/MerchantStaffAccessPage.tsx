import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type StaffRow = { id: string; name: string; role: string };

export default function MerchantStaffAccessPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [staff, setStaff] = useState<StaffRow[]>([
    { id: "1", name: "Manager", role: "Admin" },
    { id: "2", name: "Kitchen Lead", role: "Operations" },
  ]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Staff");

  const addStaff = () => {
    if (!name.trim()) { toast.error("Enter staff name"); return; }
    setStaff((prev) => [...prev, { id: crypto.randomUUID(), name: name.trim(), role }]);
    setName(""); setRole("Staff");
    toast.success("Staff access created");
  };

  const removeStaff = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    toast.success("Staff removed");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Staff Access</h1>
          <p className="text-xs text-muted-foreground">Manage team permissions</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff name" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3" />
        <button onClick={addStaff} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">Add Staff Member</button>
      </div>

      <div className="space-y-3">
        {staff.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.role}</div>
            <button onClick={() => removeStaff(row.id)} className="mt-3 w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground">Remove Access</button>
          </div>
        ))}
      </div>
    </div>
  );
}
