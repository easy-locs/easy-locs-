import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type StaffRow = {
  id: string;
  name: string;
  role: string;
  active: boolean;
};

export default function MerchantStaffAccessPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [rows, setRows] = useState<StaffRow[]>([
    { id: "1", name: "Manager 1", role: "manager", active: true },
    { id: "2", name: "Cashier 1", role: "cashier", active: true },
  ]);

  const toggleActive = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    toast.success("Staff access updated");
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Staff Access</h1>
          <p className="text-xs text-muted-foreground">Manage team permissions</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <button
          onClick={() => toast.info("Invite flow can be connected next")}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
        >
          Invite Staff Member
        </button>

        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="text-sm font-bold text-foreground">{row.name}</div>
              <div className="text-xs text-muted-foreground mt-1 capitalize">{row.role}</div>
              <button
                onClick={() => toggleActive(row.id)}
                className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold ${
                  row.active
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {row.active ? "Access Enabled" : "Access Disabled"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
