import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminPlatformAlertsPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-platform-alerts"],
    queryFn: async () => {
      const [{ data: tickets }, { data: notifications }, { data: orders }] = await Promise.all([
        supabase.from("support_tickets").select("id,status").limit(2000),
        (supabase as any).from("app_notifications").select("id,type").limit(2000),
        supabase.from("orders").select("id,status,payment_status").limit(3000),
      ]);

      return {
        openTickets: (tickets ?? []).filter((r: any) => r.status === "open").length,
        failedNotifications: (notifications ?? []).filter((r: any) => !r.read_at).length,
        disputedOrders: (orders ?? []).filter((r: any) => r.status === "disputed").length,
        unpaidOrders: (orders ?? []).filter((r: any) =>
          ["unpaid", "pending"].includes(String(r.payment_status ?? ""))
        ).length,
      };
    },
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Platform Alerts</h1>
          <p className="text-xs text-muted-foreground">Operational alert summary</p>
        </div>
      </div>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 px-4">
          <AlertMetric title="Open Tickets" value={String(data.openTickets)} danger={data.openTickets > 0} />
          <AlertMetric title="Failed Notifications" value={String(data.failedNotifications)} danger={data.failedNotifications > 0} />
          <AlertMetric title="Disputed Orders" value={String(data.disputedOrders)} danger={data.disputedOrders > 0} />
          <AlertMetric title="Unpaid Orders" value={String(data.unpaidOrders)} danger={data.unpaidOrders > 0} />
        </div>
      )}
    </div>
  );
}

function AlertMetric({
  title,
  value,
  danger,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${danger ? "border-destructive/30 bg-destructive/5" : "border-border/20 bg-card"}`}>
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className={`text-lg font-bold ${danger ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
