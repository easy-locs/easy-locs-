import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGoLiveReadiness } from "@/lib/system/goLiveReadinessChecker";

export default function AdminGoLiveReadinessPage() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["admin-go-live-readiness"],
    queryFn: () => getGoLiveReadiness(),
    staleTime: 5000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Go-Live Readiness" subtitle="Platform launch checklist" onBack={() => navigate("/admin")} />

      <div className="grid grid-cols-2 gap-3">
        <Metric title="Open Merchants" value={data?.openMerchants ?? 0} />
        <Metric title="Live Products" value={data?.liveProducts ?? 0} />
        <Metric title="Total Orders" value={data?.totalOrders ?? 0} />
        <Metric title="Ready" value={data?.ready ? "✓ Yes" : "✗ No"} />
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: any) {
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

function Metric({ title, value }: any) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
