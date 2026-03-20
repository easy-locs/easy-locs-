import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getV1Notifications } from "@/lib/v1/v1NotificationsCore";

export default function V1NotificationsPage() {
  const { user } = useAuth();

  const { data: rows = [] } = useQuery({
    queryKey: ["v1-notifications", user?.id],
    queryFn: () => getV1Notifications(user!.id),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Notifications</h1>

      <div className="space-y-3">
        {rows.map((row: any) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
            <div className="text-sm font-bold">{row.template_key || "notification"}</div>
            <div className="text-xs text-muted-foreground mt-1">{new Date(row.created_at).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.status || "pending"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
