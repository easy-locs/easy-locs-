import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { loadWorkspaceKpis } from "@/lib/admin/kpis";

export default function AdminHomeV1Page() {
  const [kpis, setKpis] = useState<any>(null);

  const load = async () => {
    const data = await loadWorkspaceKpis("REPLACE_WITH_REAL_WORKSPACE_ID");
    setKpis(data);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Admin Home V1</h1>
        <p className="text-sm text-muted-foreground">Core KPIs for launch operations</p>
      </div>

      <button onClick={load} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold">
        Load KPIs
      </button>

      {!!kpis && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Merchants", value: kpis.merchants },
            { label: "Menu Items", value: kpis.menuItems },
            { label: "Tickets Open", value: kpis.ticketsOpen },
            { label: "Dispatch Open", value: kpis.dispatchOpen },
            { label: "Recon Mismatch", value: kpis.reconMismatch },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
