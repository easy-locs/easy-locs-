import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchOpsDashboardData } from "@/repositories/admin-ops.repository";
import { projectOpsDashboard } from "@/families/dashboard/dashboard.read-model";
import { useMemo } from "react";

export default function AdminOpsDashboardPage() {
  const navigate = useNavigate();

  const { data } = useQuery({ queryKey: ["admin-ops-dashboard"], queryFn: fetchOpsDashboardData, staleTime: 15_000 });

  const model = useMemo(
    () => projectOpsDashboard(data?.orders ?? [], data?.merchants ?? [], data?.tickets ?? []),
    [data],
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">←</button>
        <div>
          <h1 className="text-lg font-bold">Operations Dashboard</h1>
          <p className="text-xs text-muted-foreground">Marketplace health</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {model.metrics.map((m) => (
          <Metric key={m.title} title={m.title} value={m.value} />
        ))}
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
